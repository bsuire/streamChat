var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var sockets = {};
var recipients = {};
var online_users = [];

function User(username,socket){
    this.username = username;
    this.socketid = socket.id;
}

app.use(express.static(__dirname + '/public', {index: false}));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

// TODO restore  previous connections in case server crashed.
// FIXME problem with unexplained connection losses, not registered as disconnections either. Timeouts?? 

// listen on connection event for new users
io.on('connection', function(socket){
    var user;

    // prompt for user name and add to online users list. Also sends back list of last 10 connected users (minus you)
    socket.on('user name', function(username){
        sockets[username] = socket; 
        user = new User(username,socket);
        var address = socket.handshake.address;
        console.log(username + ' just came online! ('+address+')');
        online_users.push(user);
        console.log(online_users);
        var matching_users = [];
        // we use -2 in the for-loop under assuming that the last element in online_users is this user
        for (var i= online_users.length - 2; i >= 0 && i > online_users.length -12; i--){
            matching_users.push(online_users[i].username); 
}
        socket.emit('update users', matching_users);
    });
    
    // FIXME returns all users BUT yourself
    // user searching for other online users: update list 
    socket.on('search', function(query){
        console.log(user.username + ' is looking for a friend starting with '+ query ); // log message into server
        var matching_users = findOnlineUsers(query);
        console.log(matching_users);
        socket.emit('update users', matching_users);
    });

    // use same event name on server and client: 'handshaking"
    socket.on('add to chat', function(add_req){
        
        // TODO if same and group size limit reached/
        // TODO add some kind of request time out
        
        add_req['from'] = user.username; 
        
        sockets[add_req['to']].emit('chat request',add_req); // TODO unwrap for better readability
        
        console.log("Start chat request from "+ user.username +" to "+ add_req['to'] + " of type "+ add_req['type']);
    });

    // RSVP 
    socket.on('RSVP', function(rsvp){
        // forward reply to sender
        // TODO security check: rsvp['from'] === user.username; 
        sockets[rsvp['to']].emit('RSVP', rsvp);
        
        if (rsvp['rsvp'] === false){
            console.log(user.username + ' turned down the request to chat!');
        } else {
            // invitation to chat accepted. Set up connection!
            console.log(user.username + ' accepted the request to chat!');
            
            // FIXME disable add to current chat option if no chat is live
            // TODO add leave chat option
            // FIXME might be some problem between new chat/add, with the contents of recipients[] not having been initialized 
            // TODO recipients Xmap could be made more space efficient, using a "triangular" table (every relationships needs only to be described one)
            //
            // TODO NEW CHAT
            //
            // Update recipients list for user 1 (from)
            var user1 = rsvp['from'];
            var user2 = rsvp['to']; 
            
            setupChat(user1,user2);    

            console.log('Recipients for '+ user1 +' are '+  recipients[user1]);
            console.log('Recipients for '+ user2 +' are '+  recipients[user2]);

            // TODO ADD TO CURRENT CHAT
            
        }
    });
     // TODO log message sent directly into one's chat interface. Also: display name of sender
    // message received
    socket.on('chat message', function(msg){
        message={};
        message['from'] = user.username;
        message['content'] = msg;
        
        console.log('message: ' + msg); // log message into server
        var to = recipients[user.username];
        for(var i=0; i < to.length; i++){
            sockets[to[i]].emit('chat message', message);
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

// FIXME make search case insensitive 
// TODO this search would be much more efficient if using a prefix tree.
function findOnlineUsers(query){
    var matching_users = []
    var string_length = query.length;
    for (var i=0; i < online_users.length; i++){
        if (online_users[i].username.substring(0,string_length) === query){
            matching_users.push(online_users[i].username);
        }
    }
    // TODO make sure that this does not yield an error if empty (I don't think it should however)
    return matching_users;
} 
// TODO improve so that it works with group chats as well
// TODO there's probably a way to make it much more elegant
function setupChat(user1,user2){

    var new_recipient_1 = [];
    var new_recipient_2 = []; 
    
    new_recipient_1.push(user2);
    recipients[user1] = new_recipient_1;
    
    new_recipient_2.push(user1);
    recipients[user2] = new_recipient_2;
}

function getUserName(socketid){
    for (var i=0; i < online_users.length; i++) {
        if (online_users[i].socketid === socketid) {
        return online_users[i];
        }
    }
}

