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

var MAX_PEERS = 4; // = maximum group size - 1 

// TODO rewrite [] as . notations? (clearer?) 

// TODO redirect console.log into a log file

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
        console.log('Online users:' + online_users);
      
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
        //console.log(user.username + ' is looking for a friend starting with '+ query ); // log message into server
        var matching_users = findOnlineUsers(query,user.username);
        //console.log(matching_users);
        socket.emit('update lobby', matching_users);
    });
    
    //  7.  FORWARD INVITE
    socket.on('invite', function(invite){  // e.g.: invite = {'to':'Nikolay','from':'Ben','type':'new' } 
        
        console.log('Chat invite from '+ user.username +' to '+ invite['to'] + ' of type '+ invite['type']);
        
        // TODO check if same and group size limit reached
        // TODO add some kind of request time out to have invites expire
        
        // forward chat invite
        // ... BUT NOT if it's an invite for a group convo and user already has 4 peers (= max allowed)
        if (invite['type'] === 'current' &&  user.peers.length === MAX_PEERS) { 

            console.log('CHAT INVITE REJECTED BY SERVER (group size limit reached)');
            // TODO: send back an 'rsvp' event with rsvp['error'] = 'Maximum group size limit reached' to be displayed 
            
            // notify user who ent the invite of the error
            var message = {};
            message['from'] = 'SERVER';
            message['content'] = 'Could not invite ' + invite['to'] + ' to this chat. Maximum number of peers reached!';
            user.socket.emit('chat message', message); //dir[peers[i]] => user object corresponding to this peer

        } else {
            dir[invite['to']].socket.emit('invite',invite); // forward chat request to targeted user
        }
    });

    //  9.  FORWARD RSVP + SETUP CHAT (if applicable) 
    socket.on('rsvp', function(rsvp){ // rsvp fields: 'to', 'from', 'type' (='new' or 'current') and 'rsvp' (boolean) 

        var user1 = rsvp['to'];    // user1 = inviter
        var user2 = rsvp['from'];  // user2 = invited
        
        // Prepare notification message from server //
        // (either to notify in case sever nullifies invite, or to notify other group chat members of the new user's arrival)
        var message = {};
        message['from'] = 'SERVER';
        
        // forward rsvp
        //  ... BUT, if it's a group/current invite that was accepted, check again for group size limit
        //  ... (user1 may have invited other user(s) in the meantime)
        
        //  case: server rejection
        
        if (rsvp['rsvp'] === true && rsvp['type'] === 'current' && dir[user1].peers.length === MAX_PEERS){
            
            console.log('RSVP received from '+ rsvp['from'] +' regarding a group chat invite from '+ rsvp['to']);
            console.log('CHAT INVITE REJECTED BY SERVER (group size limit reached)');
            
            // notify both parties that chat invite was canceled by the server 
           
            // first notify inviter
            message['content'] = 'Could not invite ' + user2 + ' to this chat. Maximum number of peers reached!';
            dir[user1].socket.emit('chat message', message); //dir[peers[i]] => user object corresponding to this peer
            
            // then invitee
            message['content'] = 'Chat invite from ' + user1 + ' canceled by the server. Maximum number of peers reached!';
            dir[user2].socket.emit('chat message', message); //dir[peers[i]] => user object corresponding to this peer
        } 
        else {      
            // no server rejection 
            
            // clear to forward rsvp as is 
            dir[user1].socket.emit('rsvp', rsvp);
           
            if (rsvp['rsvp'] === false){

                // invitation to chat rejected by user. Do nothing
                
                console.log(user2 +' rejected the chat invite from '+ user1 + '!');
            
            } else {

                // invitation to chat accepted. Log Set up connection!
                
                console.log(user2 + ' accepted the chat invite from '+ user1 +'!');
                
                // INVITE TO  NEW/PRIVATE CHAT
                //  1 disconnect both users from their current peers
                //  2 connect the two users to one another
                if(rsvp['type'] === 'new'){
                
                    //  A.i & A.ii - remove user from the list of peers of each current peer, and notify them that user has left the chat
                    // TODO make sure that these execute synchronously (don't go onward before their completion)
                    leaveCurrentChat(user1);  
                    leaveCurrentChat(user2);
            
                    //  A.iii & A.iv - reset both users's list of peers with each other's username
                    dir[user1].peers = [user2];
                    user.peers = [user1]; // because: user === dict[user2]
                    
                    // TODO don't use 'user' in substitution for dir['user2'] to improve consitency and readability ?
                }

                // INVITE TO CURRENT/GROUP CHAT
                //  1. disconnect user2 from his or her current peers
                //  2. connect user2 to user1 and his/her peers 
                else {
                
                    leaveCurrentChat(user2); // disconnets user2 from current peers
                    
                    // prepare notification message 
                    message['content'] = user1 + ' just added ' + user2 + ' to this conversation !';
                    
                    // first connect user2 with user1's peers 
                    for (var i = 0; i < dir[user1].peers.length; i++){
                        
                        var username = dir[user1].peers[i]; 
                        // TODO notify each third party peers that we've added user 2 to their chat    
                        // Note: this.user is the user object associated user2
                        user.peers.push(username);          // add this (user1) peer to user2's list peers
                        dir[username].peers.push(user.username);  // add user2 to this (user1) peer's list of peers
                        
                        // notify the peer that he/she is now talking to user2 as well
                        dir[username].socket.emit('chat message', message); //dir[peers[i]] => user object corresponding to this peer
                    }  

                    // second, connect user2 with user1 him/herself
                    user.peers.push(user1); // user2 === user.username
                    dir[user1].peers.push(user2);
                }
            }  
            
            // Voila! user1 and user2 just started a private chat! 
            console.log('Chat room updated!  '+ user1 + ',' +  dir[user1].peers + ' are now chatting together!');
            //console.log('Peers for '+ user2 +' are '+  dir[user2].peers);

            
        }
    });
    // message received
    socket.on('chat message', function(msg){
        message={};
        message['from'] = user.username;
        message['content'] = msg;
        
        var to = user.peers;
        
        for(var i=0; i < to.length; i++){
            dir[to[i]].socket.emit('chat message', message); // to[i]: a peer we need to get the message to. dir[to[i]] => its user object
        }
        console.log(user.username + ' to:' + to);
        console.log('message: ' + msg);
    });

    // user disconnects. Remove user from online users list
    socket.on('disconnect', function(){
        // FIXME user undefined error! (timeouts?)
        try{
            console.log(user.username + ' disconnected');
            
            // notify peers that user disconnected
            leaveCurrentChat(user.username); // TODO differentiate disconnection from leaving

            // delete user from memory 
            var x = online_users.indexOf(user.username);
            online_users.splice(x,1);

            delete dir[user.username];
        } 
        catch(err){
            // this error appears every now and then, but app remains fully fonctional anyhow  
            console.log('WARNING: errorr on disconnect event (user.username undefined)');
        }
        console.log('Number of users online: '+ online_users.length);
        console.log('Online users:' + online_users);
    });

    // FIXME bug: sometimes, dir{} and online_users[] are non-empty after all chat windows have been closed...
    // we monitor additional events to investigate
    socket.on('error', function(err){
        console.log('UNEXPECTED EVENT : error');
    });
    socket.on('reconnect', function(nb_attemps){
        console.log('UNEXPECTED EVENT : reconnect');
    });
    socket.on('reconnect_attempt', function(){
        console.log('UNEXPECTED EVENT : reconnect_attempt');
    });
    socket.on('reconnect_error', function(err){
        console.log('UNEXPECTED EVENT : reconnect_error');
    });
});

// setup server to listen for requests at the environement's IP, and the specified port (defaults to 3000)
var port = process.env.PORT || 3000;
http.listen(port, function () {
    var addr = http.address();
    console.log('listening on http://' + addr.address + ':' + addr.port);
});


// FUNCTIONS

// 1 findOnlineUsers(query,user). Returns a list of usernames matching the prefix contained in query

// FIXME make search case insensitive  

// TODO: with a large number of online users, a more efficient search algorithm would be:
// 1. sort array
// 2. find first and last matching element
// 3. get slice of array from first to last match
// or even fancier, store online users in a prefix tree  

function findOnlineUsers(query,user){ // query = user string input ('Be'), user = user's username
    var matching_users = []
    var string_length = query.length;
    
    for (var i=0; i < online_users.length; i++){
      
        if (online_users[i].substring(0,string_length) === query && online_users[i] !== user){
            matching_users.push(online_users[i]);
        }
        if (matching_users.length === 15) break;
    }
    return matching_users; 
}

// 2 leaveCurrentChat removes a user from his/her current conversation
// --> notifies current peers that user has left their conversation
// --> remove user from each peer's own list of peers
// --> clear user's list of peers

function leaveCurrentChat(username){
    // prepare notification message
    var message = {};
    message['from'] = 'SERVER';
    
    var peers = dir[username].peers;

    for(var i = 0; i < peers.length; i++){

        //  remove user from this peer's own set of peers 
        // note: dir[peers[i]] => user object corresponding to this peer
        
        var j = dir[peers[i]].peers.indexOf(username);  
        dir[peers[i]].peers.splice(j,1);

        //  notify this peer
        message['content'] = username + ' left this conversation';
        dir[peers[i]].socket.emit('chat message', message);
    }
    // 3)   clear user's set of peers 
    dir[username].peers = [];
}
