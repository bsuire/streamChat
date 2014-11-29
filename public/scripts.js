// TODO be consistent with use of quotation marks (choose single quotes over double)
// TODO this file has too many scripts: use a separate .js file. (ideally, for the styling as well)

// TODO use a unique background color for each user's messages!
// TODO Show list of conversation peers  in side pannel
// TODO implement scrolling in lobby (userlist) or make sure server always limits the number of users to what's visible

//  A   SIGN IN
var socket = io(); 

var my_username = '';

my_username = prompt("Please enter your name");

//  check that username is valid: /\S/ checks that there is at least one none blank character in the name provided
// TODO: limmit username length to something reasonable (that won't break the display)
// TODO: limit character set to letters,numbers and spaces/underscore/dash/etc. But no '\'. 
while (!(/\S/.test(my_username))) {
    my_username = prompt("Your name cannot be left blank! Please enter your name again");
}

// send username to server
socket.emit('sign in',my_username); 


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
// TODO UI: add auto scrolling to bring into view the most recent message 
// TODO browser notifcation when receiving message and user is not viewing page

$('form').submit(function(){
    
    // send message to server
    socket.emit('message', $('#m').val());
    
    // append user's own message directly to his/her chat window
    $('#messages').append($('<li style="color:gray; font-weight: 100;">').text('You:\t' + $('#m').val()));
    
    $('#m').val(''); // reset message input box
    return false;
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
});

