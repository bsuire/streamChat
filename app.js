// TODO : document intro
// Author: Ben
// Date:
// Summary:
//
// List of keywords: 
//  - lobby: refers to the list of online users that the user can see on the right-side panne of the UI
// 
// List key sections ?


var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);


// TODO add some constants/parameters (max group size, etc)
// TODO better document what each global variable does (what's it for, what it stores, as what, etc)
// TODO save sockets into a database in order to be able to recover in case of crash (and make list of registered users persistent)
var dir = {}; // list of all User objects, accessed using their respective usernames as keys.
var online_users = []; // list of online users, identified by their usernames (useful shortcut. Necessary if directory has both online and offline users)

function User(username,peers,ip,socket){ // each user object has two fields: 1. username and  2. peers 
    this.username = username;   // username : 'Ben'  
    this.peers = peers;         // peers : {socketid_1, socketid_2, socketid_3} (max of 5)
    this.ip = ip;               // IP address (used for banning)
    this.socket = socket;       // Socket
    // this.status = status;   // is user online or offline? (could be boolean variable)
    // this.banned = banned   // another boolean: have we banned usser?
    // //  email, lastname, firstname, password  ===> other fields to add if using sign up system with email authentification
    //this.socketid = socket.id; // delete
}

app.use(express.static(__dirname + '/public', {index: false})); // indicates where static files are located 

app.get('/', function(req, res){                // serve HTTP GET requests that hit our app's homepage
    res.sendFile(__dirname + '/index.html');    // index.html is our main UI / comprehensive chat inteface
});

// TODO make data persistent using a database (Mango DB). 
// FIXME regarding above TODO, if using Mangodb, socket field might be a pb 
// TODO restore  previous connections in case server crashed,.
// FIXME problem with unexplained connection losses, not registered as disconnections either. Timeouts?? 

// listen on connection event for new users: once served, index.html will initiate a socket connection to our chat server
io.on('connection', function(socket){
    
    var user;       // user object for this socket connection
    // FIXME FIXME: user objects might be modified in the directory. Are dir[username] and this.user pointing to the same structure??
    // ..........  otherwise, move this declaration inside "sign in" event, or refresh before using: user = dir[user.username]
    //  TODO: keep peers[] and username accessible throughout? 
    //  Cons: prohibits use of these names in all functions + wastes memory.
    //  Pro:  less and more readable code: username instead of user.username, etc. 
    //var peers = []; // list of peers the above user is chatting with  
    //var username;   // user's username
    
    //  2   SIGN IN
    socket.on('sign in', function(username){ // newly connected user is sending us his/her username
        
        var peers = [];  
        var ip = socket.handshake.address; 
        
        // TODO check that username is not already used by another user!

        //  2.a Add new user to the directory  
        user = new User(username,peers,ip,socket);
        dir[username] = user;       // user directory
        online_users.push(username);  // list of user IDs 

        console.log(username + ' just signed in!');
        console.log('Number of users online: '+ online_users.length);
        console.log(online_users);
      
        //  2.b Send a list of online users to the new user  
        var matching_users = [];
          
        // i=online_users.length -2, because the last element in online_users is our new user him/herself
        for (var i= online_users.length - 2; i >= 0 && i > online_users.length -12; i--){
            matching_users.push(online_users[i]); // adds up to 10 of the last users  
        }
        socket.emit('update lobby', matching_users);
    });
    
    
    //  5.  SEARCH ONLINE USER 
    // user searching for other online users: update list 
    
    // FIXME returns all users BUT yourself
    // FIXME check use case: user1 sends invite to user2 who just left the chat (but lobby wasn't updated)  
    socket.on('search', function(query){
        console.log(user.username + ' is looking for a friend starting with '+ query ); // log message into server
        var matching_users = findOnlineUsers(query);
        console.log(matching_users);
        socket.emit('update lobby', matching_users);
    });
    
    //  7.  FORWARD INVITE
    socket.on('invite', function(invite){  // e.g.: invite = {'to':'Nikolay','from':'Ben','type':'new' } 
        
        // TODO check if same and group size limit reached/
        // TODO add some kind of request time out to have invites expire
        
        // NOTE: having the server set this field = more secure?
        //invite['from'] = user.username; 
        
        dir[invite['to']].socket.emit('invite',invite); // forward chat request to targeted user
        
        console.log("Chat invite from "+ user.username +" to "+ invite['to'] + " of type "+ invite['type']);
    });

    //  9.  FORWARD RSVP + SETUP CHAT (if applicable) 
    socket.on('rsvp', function(rsvp){ // rsvp has: 'to', 'from', and 'rsvp' (boolean) fields
        
        // 9.a  forward rsvp to sender
        dir[rsvp['to']].socket.emit('rsvp', rsvp);
        
        if (rsvp['rsvp'] === false){
            console.log(user.username +' turned down the chat invite from '+ rsvp['to'] + '!');
        } else {
            // invitation to chat accepted. Set up connection!
            console.log(user.username + ' accepted the chat invite from '+ rsvp['to'] +'!');
            
            // TODO move all the code for starting chats elsewhere, and split it between two different function (one for 'new', another for 'current'

            // FIXME disable add to current chat option if no chat currently open (or make sure that results in the same)
            // TODO add leave chat optioni? 
            // FIXME might be some problem between new chat/add, with the contents of broadcasts[] not having been initialized 
            //
            // TODO  NEW CHAT (= private, 1 to 1 chat)
            //  9.b.A   SETUP A NEW CHAT
            //  - (i)     remove user from each peer's own peers list
            //  - (ii)    notify each peer that user has left conversation
            //  - (iii)   empty user's current list of peers and add new peer 
            //  - (iv)    update each user's peers with the other user's name
            //  =======> users are ready to chat! 
            
            var user1 = rsvp['to']; // note: user1 is a username, not a user object
            var user2 = rsvp['from'];   // same --
            
            // TODO: note: user2 will always quit his chat! 
            
            // TODO TODO TODO use separate function that returns list of peers to notify. Notify them in here. 
            
            //  A.i & A.ii  remove user from the list of peers of each current peer, and notify them user has left the chat
            var peers = dir[user1].peers;
            
            for(var i = 0; i < peers.length; i++){
                
                // A.i remove user from this peer's peers  
                // note: dir[peers[i]] => user object corresponding to this peer
                var j = dir[peers[i]].peers.indexOf(user1);  
                dir[peers[i]].peers.splice(j,1);

                // A.ii notify peer
                dir[peers[i]].socket.emit('peer left', user1); //dir[peers[i]] => user object corresponding to this peer
            } 

            peers = dir[user2].peers;
            
            for(var i = 0; i < peers.length; i++){
                
                // A.i remove user from this peer's peers  
                // note: dir[peers[i]] => user object corresponding to this peer
                var j = dir[peers[i]].peers.indexOf(user1);  
                dir[peers[i]].peers.splice(j,1);

                // A.ii notify peer
                dir[peers[i]].socket.emit('peer left', user2); //dir[peers[i]] => user object corresponding to this peer
            } 
            ///////////////
            //  A.iii & A.iv - reset both users's list of peers with each other's username
            dir[user1].peers = [user2]; // TODO check that this is the proper way to do this 
            dir[user2].peers = [user1];

            // Voilà! user1 and user2 just started a private chat! 
            console.log('Peers for '+ user1 +' are '+  dir[user1].peers);
            console.log('Peers for '+ user2 +' are '+  dir[user2].peers);

            // TODO CURRENT CHAT (= group chat, by adding a 3rd, 4th or 5th peer to current chat)
            
        }
    });
     // TODO log message sent directly into one's chat interface. Also: display name of sender
    // message received
    socket.on('chat message', function(msg){
        message={};
        message['from'] = user.username;
        message['content'] = msg;
        
        console.log('message: ' + msg); // log message into server
        var to = dir[user.username].peers; // FIXME is it equivalent to user.peers, or is the latter not automatically updated?
        for(var i=0; i < to.length; i++){
            dir[to[i]].socket.emit('chat message', message); // to[i]: a peer we need to get the message to. dir[to[i]] => its user object
        }
    });

    // user disconnects. Remove user from online users list
    socket.on('disconnect', function(){
        try{
            var username = user.username;
            console.log(username + ' disconnected');
        } 
        catch(err){ 
            console.log("Error on disconnect event.");
        } 
        
        var i = online_users.indexOf(user);
        online_users.splice(i,1);
        sockets[user.username] = null;
        console.log(online_users);
        console.log(sockets);
    });
});


http.listen(3000, function(){
    console.log('listening on *:3000');
});

// HELPER FUNCTIONS

// 1 find online users. Cue: 'search' event (part 5)
// FIXME make search case insensitive  
// TODO sort matching users to make querying faster (but do that at the right place (scope, frequency)
// FIXME limit number of users returrned in matching users (we probably don't want 1000 users.  
// FIXME make sure than no empty list is displayed if function is too long (serialize). 
// ...  However, that shouldn't occur because function is returning a value, and not used as a process 
function findOnlineUsers(query){
    var matching_users = []
    var string_length = query.length;
    for (var i=0; i < online_users.length; i++){
        if (online_users[i].username.substring(0,string_length) === query){
            matching_users.push(online_users[i].username);
        }
    }
    // TODO make sure that this does not yield an error if empty (I don't think it should however)
    return matching_users;  // TODO limit size? 
}

// 2 remove a user from current conversation
// --> notify current peers that user has left their conversation
// --> remove user from each peer's own current list of peers
// --> clear user's list of peers
// TODO would that be better declared as a method associated to User objects 
//   ... (pb: won't be able to save Users into a database anymore?)
function leaveCurrentChat(username){

    var peers = dir[username].peers;
    
    for(var i = 0; i < peers.length; i++){
        var peer = user_recipients[i];
        var peer_recipients = broadcasts[peer];

    } 

    
    var user_recipients = broadcasts[user];
    
}
// addToChat : adds user1 to user2's list of peers
//
//  9A.iii   empty user's current list of peers and add new peer 
//  9. A.iv    update each user's peers with the other user's name
// TODO improve so that it works with group chats as well
// TODO there's probably a way to make it much more elegant
function setupChat(user1,user2){ // user1 and user2 are both usernames, not user objects

    var new_recipient_1 = [];
    var new_recipient_2 = []; 
    
    new_recipient_1.push(user2);
    
    // before starting new chat, remove user from others's lists of broadcasts , then update user's own list of broadcasts
    delete broadcasts[user1];
    broadcasts[user1] = new_recipient_1;
    
    new_recipient_2.push(user1);
    delete broadcasts[user2];
    broadcasts[user2] = new_recipient_2;
    return true;
}


function getUserName(socketid){
    for (var i=0; i < online_users.length; i++) {
        if (online_users[i].socketid === socketid) {
        return online_users[i];
        }
    }
}

