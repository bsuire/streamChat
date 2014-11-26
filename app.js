var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

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

    // add
    socket.on('add to chat', function(add_req){
        console.log(add_req['type']);
        console.log(add_req['username']);
    });

    
    // message received
    socket.on('chat message', function(msg){
        console.log('message: ' + msg); // log message into server
        //socket.broadcast.to(userid).emit('my message', msg);
        io.emit('chat message', msg);
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
        console.log(online_users);
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


function getUserName(socketid){
    for (var i=0; i < online_users.length; i++) {
        if (online_users[i].socketid === socketid) {
        return online_users[i];
        }
    }
}

// http://stackoverflow.com/questions/13063350/node-js-incoming-request-sourceip
var getClientIp = function(req) {
    var ipAddress = null;
    var forwardedIpsStr = req.headers['x-forwarded-for'];
    if (forwardedIpsStr) {
    ipAddress = forwardedIpsStr[0];
    }
    if (!ipAddress) {
    ipAddress = req.connection.remoteAddress;
    }
    return ipAddress;
};
