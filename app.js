var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public', {index: false}));


app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

// listen on connection event for new users
io.on('connection', function(socket){
    console.log('new user connected');

    // message received
    socket.on('chat message', function(msg){
        console.log('message: ' + msg); // log message into server
        io.emit('chat message', msg);
    });

    // listen on disconnection events for sockets for users leaving
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
});



http.listen(3000, function(){
      console.log('listening on *:3000');
});
