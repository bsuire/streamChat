// TODO be consistent with use of quotation marks (choose single quotes over double)
// TODO this file has too many scripts: use a separate .js file. (ideally, for the styling as well)

// TODO use a unique background color for each user's messages!
// TODO Show list of conversation peers  in side pannel
// TODO implement scrolling in lobby (userlist) or make sure server always limits the number of users to what's visible

var MAX_UPLOAD_SIZE = 1.5; // in MB

var socket = io(); 

var my_username;

// P2P CODE (in dev)

var p2p_socket; // socket connected to a peer

// P2P Initiator
socket.on('p2p',function(ip){
    
    p2p_socket = io.connect(ip); // connection to a peer
    p2p_socket.emit('peer_connection');
});
// P2P Receiver
socket.on('peer_connection',function(){
    
    alert('Received a connection request');

});

//  A   SIGN IN
// prompts and sets username, then sends it to server
signIn(1);

socket.on('name taken', function(){
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
    socket.emit('sign in', my_username); 
}

//  B   UPDATE LOBBY (automatic upon signing in)
//      lobby = list of online users
socket.on('update lobby', function(users_list,total_users){
    
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
    socket.emit('search',$('#search').val()); // emit search event and pass query/content of search box
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

    socket.emit('invite', invite); // send invite to chat
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
socket.on('invite', function(invite){ // e.g.: invite = {'to':'Nikolay','from':'Ben','type':'new' }  
     
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
    socket.emit('rsvp', rsvp); // send rsvp to be processed by server
    // ('rsvp' socket event, rsvp associative array, and rsvp.rsvp = true/false. RSVPs everywhere...) 
});



//  F   RECEIPT OF RSVP
socket.on('rsvp', function(rsvp){
    
    if (rsvp['rsvp'] === true){
  
        alert('Awesome! '+ rsvp['from'] +' accepted your chat invite :)');
    } 
    else 
    {
        alert('Sorry! '+ rsvp['from'] + ' turned down your chat invite :(');
    } 
});    


//  G   SEND MESSAGE 
$('#sendmessage').submit(function(){
    
    // send message to server
    socket.emit('message', $('#m').val());
    
    // append user's own message directly to his/her chat window
    $('#messages').append($('<li style="color:gray; font-weight: 100;">').text('You:\t' + $('#m').val()));
    
    scrollDown();
    
    $('#m').val(''); // reset message input box
    return false;    // sothat the page doesn't reload
});


// H  RECEIVE MESSAGE
// -- displays received message into chat window
// -- can be from either a chat message or a notification from the server 
socket.on('message', function(msg){
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


// I    SHARE FILE
// source: http://www.sitepoint.com/html5-file-drag-and-drop/
var imageReader = new FileReader();
var videoReader = new FileReader();
var file;

$('#fileselect').change(function(e){
    
    // get file object from file selector input
    file = e.target.files[0];   

});


// source: http://www.htmlxprs.com/post/6/creating-a-realtime-image-sharing-app-with-ionic-and-socketio-tutorial

$('#upload').submit(function(){

    if (file){
   
        if (file.type.substring(0,5) === 'image' || file.type.substring(0,5) === 'video'){
        
            if (file.size > MAX_UPLOAD_SIZE * 1000 * 1000)
            {
                alert('Sorry, we can only accept files up to ' + MAX_UPLOAD_SIZE + ' MB');
            }
            else if (file.type.substring(0,5) === 'image'){
                
                // upload image  
                imageReader.readAsDataURL(file);
            }
            else if (file.type.substring(0,5) === 'video'){
                
                // uplaod video  
                videoReader.readAsDataURL(file);
            }
        }
        else {
            alert("Sorry, you an only share images or videos");
        }

        // reset select box and file object 
        $('#fileselect').val('');
        file = '';
    }
    else
    {
        alert("You haven't selected any file to share");
    }
    
    return false; // don't reload the page
});


imageReader.onload=function(e){
    
    // append image to own interface
    appendFile(e.target.result,'image','self');
    scrollDown();
    
    // share image
    socket.emit('file',e.target.result,'image');
};

videoReader.onload=function(e){
    
    // append video to own interface
    appendFile(e.target.result,'video','self');
    scrollDown();
    
    // share video
    socket.emit('file',e.target.result,'video');
};

socket.on('file', function(dataURI,type,from){
    
    appendFile(dataURI,type,from);
    scrollDown();

});


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

function scrollDown(){
    $('#chat').animate({scrollTop: $('#chat').prop("scrollHeight")}, 500); 
}
