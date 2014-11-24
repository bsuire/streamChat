var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var online_users = [];

function User(user_name,socket){
    this.user_name = user_name;
    this.socket_id = socket.id;
}

app.use(express.static(__dirname + '/public', {index: false}));


app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});



// listen on connection event for new users
io.on('connection', function(socket){
    var user;
    //console.log('new user connected');

    socket.on('user name', function(user_name){
        user = new User(user_name,socket);
        console.log(user_name + ' just came online!');
        online_users.push(user);
        console.log(online_users);
    });

    
    // message received
    socket.on('chat message', function(msg){
        console.log('message: ' + msg); // log message into server
        io.emit('chat message', msg);
    });

    // listen on disconnection events for sockets for users leaving
    socket.on('disconnect', function(){

        //console.log(getuserName(socket.id) + ' disconnected');
        console.log(user.user_name + ' disconnected');
        
        var i = online_users.indexOf(user);
        online_users.splice(i,1);
        console.log(online_users);
    });
});


http.listen(3000, function(){
    console.log('listening on *:3000');
});


function getUserName(socket_id){
    for (var i=0; i < online_users.length; i++) {
        if (online_users[i].socket_id === socket_id) {
        return online_users[i];
        }
    }
}
