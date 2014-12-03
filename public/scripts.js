// TODO be consistent with use of quotation marks (choose single quotes over double)
// TODO this file has too many scripts: use a separate .js file. (ideally, for the styling as well)

// TODO use a unique background color for each user's messages!
// TODO Show list of conversation peers  in side pannel
// TODO implement scrolling in lobby (userlist) or make sure server always limits the number of users to what's visible

var MAX_UPLOAD_SIZE = 1.5; // in MB

var server_socket = io(); 

var my_username;
var my_socketid; 


// Web RCT stuff
// http://danristic.com/html5/javascript/webrtc/2013/08/13/using-the-webrtc-data-channel.html
var IS_CHROME = !!window.webkitRTCPeerConnection,
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription;

if (IS_CHROME) {
    RTCPeerConnection = webkitRTCPeerConnection;
    RTCIceCandidate = window.RTCIceCandidate;
    RTCSessionDescription = window.RTCSessionDescription;
} else {
    RTCPeerConnection = mozRTCPeerConnection;
    RTCIceCandidate = mozRTCIceCandidate;
    RTCSessionDescription = mozRTCSessionDescription;
}

var iceServers = {
    iceServers: [{
        url: 'stun:stun.l.google.com:19302'
    }]
};


// TODO monitor P2P error 

// Create peer connection request object
var p2p_connection = new RTCPeerConnection({
      iceServers: [
        { 'url': (IS_CHROME ? 'stun:stun.l.google.com:19302' : 'stun:23.21.150.121') }
  ]
});


// SEND PEER CONNECTION REQUEST
function initiateConnection() {
    p2p_connection.createOffer(function (description) {
        p2p_connection.setLocalDescription(description);
        server_socket.emit('p2p request', description,my_username); 
    });
};

// RECEIVVE PEER CONNECTION REQUEST
server_socket.on('p2p request', function(description,sender){

    console.log('received p2p request');
    console.log(description);

    p2p_connection.setRemoteDescription(new RTCSessionDescription(description));

    p2p_connection.createAnswer(function (description) {
        p2p_connection.setLocalDescription(description);
        server_socket.emit('p2p reply', description,sender);
    });
});
        
// RECEIVE REPLY
server_socket.on('p2p reply', function(description,sender){
    
    console.log('received p2p reply');
    console.log(description);
    
    p2p_connection.setRemoteDescription(new RTCSessionDescription(description));

});

// ICE candidates
p2p_connection.onicecandidate = onicecandidate; // sent event listener

// locally generated
function onicecandidate(event) {
    if (!p2p_connection || !event || !event.candidate) return;
    var candidate = event.candidate;
    server_socket.emit('add candidate',candidate,my_username);    
}
 
// sent by other peer
server_socket.on('add candidate', function(candidate,sender){
    
    p2p_connection.addIceCandidate(new RTCIceCandidate({
            sdpMLineIndex: candidate.sdpMLineIndex,
            candidate: candidate.candidate
    }));
});


// DATA P2P CHANNEL 

var sendChannel = p2p_connection.createDataChannel('label');

sendChannel.onmessage = function (event) {
    var data = event.data;
    console.log("I got data channel message: ", data);
};

// both receive this
p2p_connection.ondatachannel = function (event) {
    receiveChannel = event.channel;
    receiveChannel.onmessage = function(event){
    console.log(event.data);
    };
};


var p2p_ready = false; 

sendChannel.onopen = function (event) {
    console.log("Data channel ready");
    sendChannel.send("Welcome");
    p2p_ready = true; 
};
sendChannel.onclose = function (event) {
    console.log("Data channel closed.");
    p2p_ready = false; 
};
sendChannel.onerror = function (event) {
    console.log("Data channel error!");
    p2p_ready = false; 
};


//  A   SIGN IN
// prompts and sets username, then sends it to server
signIn(1);

server_socket.on('name taken', function(){
    signIn(2);
});

function signIn(attempt){
    
    if (attempt === 1){ 
        my_username = prompt("Please enter your name");
    }
    else {
        my_username = prompt(my_username + ' is not available. Please enter another name');
    }
    // TODO: limit username length to something reasonable (that won't break the display)
    // TODO: limit character set to letters,numbers and spaces/underscore/dash/etc. But no '\'. 
    
    //  check that username is valid: /\S/ checks that there is at least one none blank character in the name provided
    while (my_username === null || my_username === '' || !(/\S/.test(my_username)) ) {

        if ( !(/\S/.test(my_username)) ) {

            my_username = prompt("Your name cannot be left blank! Please enter your name again");
        }
        else
        {
            my_username = prompt("You cannot access server without entering a name first!");
        }
    }
    server_socket.emit('sign in', my_username); 
}

// TODO check: client socket might already have a socket.id field that matches the one on server side
server_socket.on('sign in ack',function(socketid){
    my_socketid = socketid; 
});

//  B   UPDATE LOBBY (automatic upon signing in)
//      lobby = list of online users
server_socket.on('update lobby', function(users_list,total_users){
    
    $('#users').empty(); // clean lobby

    //  add users to lobby 
    for(var i=0; i < users_list.length; i++){
        $('#users').append($('<li draggable="true" ondragstart="drag(event)">').text(users_list[i]));
    }
    // refresh the number of users signed in
    $('#tally').empty();
    $('#tally').append(total_users +' users online');  
});


//  C   SEARCH  USERS
// search for other users online (refreshed for every keystroke in search box event) 
$("#search").on("input", function() {
    server_socket.emit('search',$('#search').val()); // emit search event and pass query/content of search box
});

$('#searchfriend').submit(function(){
    return false;
});


//  D   SEND A CHAT INVITE
//       Drag and drop someone's name in order to send him/her an invite  
function drop(ev,type) { 
    ev.preventDefault();

    var peer_username = ev.dataTransfer.getData("text"); // drag and drop transfers username
    var invite = {}; 

    invite['type'] = type; // type = 'new' or 'current' (chat with this user only, or add user to current chat) 
    invite['to'] = peer_username;
    invite['from'] = my_username; 

    server_socket.emit('invite', invite); // send invite to chat
}

// functions to enable drag and drop
function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.innerHTML); // sets username contained in dragged element as transfer data
}


//   E    RSVP TO CHAT INVITE 
//      User gets a chat invite from another user. User sends back yes/no reply (rsvp).
server_socket.on('invite', function(invite){ // e.g.: invite = {'to':'Nikolay','from':'Ben','type':'new' }  
     
    var rsvp = {}; 
    rsvp['to'] = invite['from']; // swap to and from fields
    rsvp['from'] = invite['to'];
    rsvp['type'] = invite['type'];// server needs to know the invite type to choose the appropriate chat setup procedure

    // prompt user to either accept or turn down the invite 
    // TODO use invite['type'] to tell user if invited to a private or group chat
    // TODO make names bold to make them more readable 
    
    if (confirm(invite['from'] + ' just invited you to chat!\n Do you want to chat with '+ invite['from'] +'?')) {
    
        rsvp['rsvp'] = true; 
        // TODO: add list of peers to invite, and append to msg board "You are now talking to: [updated list of peers] " 
    } 
    else 
    {
        rsvp['rsvp'] = false; 
    }
    server_socket.emit('rsvp', rsvp); // send rsvp to be processed by server
    // ('rsvp' socket event, rsvp associative array, and rsvp.rsvp = true/false. RSVPs everywhere...) 
});



//  F   RECEIPT OF RSVP
server_socket.on('rsvp', function(rsvp){
    
    if (rsvp['rsvp'] === true){
  
        alert('Awesome! '+ rsvp['from'] +' accepted your chat invite :)');
        
        // other user accepted chat invite. 
        // setup peer connection ahead of eventual file sharing
        initiateConnection();
    } 
    else 
{
        alert('Sorry! '+ rsvp['from'] + ' turned down your chat invite :(');
    } 
});    


//  G   SEND MESSAGE 
$('#sendmessage').submit(function(){
    
    // send message to server
    server_socket.emit('message', $('#m').val());
    
    // append user's own message directly to his/her chat window
    $('#messages').append($('<li style="color:gray; font-weight: 100;">').text('You:\t' + $('#m').val()));
    
    scrollDown();
    
    $('#m').val(''); // reset message input box
    return false;    // sothat the page doesn't reload
});


// H  RECEIVE MESSAGE
// -- displays received message into chat window
// -- can be from either a chat message or a notification from the server 
server_socket.on('message', function(msg){
    // TODO: assign a different color to each user

    if(msg['from'] === 'SERVER')
    {
        // use italics for server notifications to make them stand out
        var notification =  msg['content'].italics();
        notification =  msg['from'] + ':\t' + notification;
        $('#messages').append('<li>' + notification + '</li>');
    }
    else
    {
        $('#messages').append($('<li>').text(msg['from'] + ':\t' + msg['content']));
    }
    scrollDown();
});


//// I    SHARE FILE
// source: http://www.sitepoint.com/html5-file-drag-and-drop/
var imageReader = new FileReader();
var videoReader = new FileReader();
var file;

$('#fileselect').change(function(e){
    
    // get file object from file selector input
    file = e.target.files[0];   

});


// User wishes to uplaod a file. Validate.
$('#upload').submit(function(){
    
    if (file){
        if (file.type.substring(0,5) === 'image' || file.type.substring(0,5) === 'video'){
        
            if (file.size > MAX_UPLOAD_SIZE * 1000 * 1000)
            {
                alert('Sorry, we can only accept files up to ' + MAX_UPLOAD_SIZE + ' MB');
            }
            else if (file.type.substring(0,5) === 'image'){
                // upload image 
                shareFile(file,'image'); 
            }
            else if (file.type.substring(0,5) === 'video'){
                // uplaod video  
                shareFile(file,'video');
            }
        }
        else {
            alert("Sorry, you an only share images or videos");
        }
        // reset select box 
        $('#fileselect').val('');
    }
    else{
        alert("You haven't selected any file to share");
    }
    return false; // don't reload the page
});

// share an image or video
function shareFile(file,type){
   
    if(p2p_ready){
        sendChannel.send("Hey World!");
    }
    //p2p_connection.send("Hello World!");

    file = '';
//    if(type === 'image'){
//        imageReader.readAsDataURL(file);
//    } else {
//        videoReader.readAsDataURL(file);
//    }
}


imageReader.onload=function(e){
    
    // append image to own interface
    appendFile(e.target.result,'image','self');
    scrollDown();
    
    // share image
    // TODO try stream?
    server_socket.emit('file',e.target.result,'image');
};

videoReader.onload=function(e){
    
    // append video to own interface
    appendFile(e.target.result,'video','self');
    scrollDown();
    
    // share video
    server_socket.emit('file',e.target.result,'video');
};

// Receive file using WebRTC 
// on getting local or remote media stream
//peer_connection.onstream = function(e) {
//document.body.appendChild(e.mediaElement);
//};

// Receive file using socket.io single chunk
server_socket.on('file', function(dataURI,type,from){
    
    appendFile(dataURI,type,from);
    scrollDown();

});


// User Diconnected Error 
server_socket.on('disconnect',function(){
    
    notification = 'SERVER:\t You have been disconnected'.italics();
    $('#messages').append('<li>' + notification + '</li>');
});

// Appends either an image or a video file to user's chat window
function appendFile(URI,type,user){
    
    if (user === 'self'){
        $('#messages').append($('<li style="color:gray; font-weight: 100;">').text('You:'));
    }
    else {
        $('#messages').append($('<li>').text(user + ':'));
    }

    if (type === 'image'){
        $('#messages').append('<li><img src="' + URI + '" height="150px" /><li>');
    }
    else {
        $('#messages').append('<li><video width="320" height="240" controls><source src="' + URI + '"><li>');
    }
}
// Autoamtic scroll down message on any kind of chat message (text or file)
function scrollDown(){
    $('#chat').animate({scrollTop: $('#chat').prop("scrollHeight")}, 500); 
}
