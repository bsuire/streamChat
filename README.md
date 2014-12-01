streamChat
==========

streamChat is a Node.js browser based chat application, available here: https://stream-chat-plus.herokuapp.com/

streamChat uses socket.io for real-time communications between users.

I used the following demo http://socket.io/get-started/chat/ as a boilerplate.

Moreover, I also relied on Craig Buckler's tutorial http://www.sitepoint.com/html5-file-drag-and-drop/ in order to help me with file uploads.


### Features
 - [x] private, one on one chat
 - [x] group chat (up to 5 peope)
 - [x] look up online users
 - [x] ban users
 - [x] image & video sharing (up to 1.5 MB)
 - [ ] P2P image & video sharing

### Technology

##### Backend:
  - Node.js + Express
  - socket.io-server
  
##### Frontend:
  - socket.io-client
  - jQuery

### User Guide

##### Getting started

1. Use the search box at the top right to find a friend.
2. Drag the friend's name and drop it at either "Add to Current Chat" or "Start a New Chat".
3. Once your friend approves the request you can start chatting!

##### Group conversations

1. Find another friend using the search box.
2. Drag and drop name over "Add to Current Chat".
3. This will send your friend an invitation to join your conversation.
 
##### File sharing

1. Click the "Choose File" button and select an image or video file to share".
2. Hit the button "Share!"

Files can only be a maximum of 1.5 MB with the current implementation.
From Montréal to Heroku's servers and back, it takes about 1s/50kB.

##### Ban a user

1. Go to the admin page, which is just app_name/admin (https://stream-chat-plus.herokuapp.com/admin)
2. Enter a username (case sensitive), and click 'ban!'

Note that, since all user data is deleted from memory as soon as he/she goes offline, banning a user only works if he/she's still signed in. However, banning a user who's currently online will also "kick" this user off the server.



### Running the application (locally)

##### 1. Download app

Go into the project directory where you would like to install the application, then run:
```
git clone https://github.com/bsuire/streamChat
```

##### 2. Install Node.js

For OS X users:
```
brew install nvm
```

##### 3. Install app

From the project directory, run:
```
nvm use 0.10
```
Then:

```
npm install
```
... which will install all of the modules required to run this application.

##### 4. Run app

Finally, you can run the application locally with:
```
npm start
```
Which should display:
```
listening on http://0.0.0.0:3000
```
To start using the chat app, open your browser at http://localhost:3000/

Happy chatting!

### Implementation 

##### Method

I decided to implement features following the logical order of a user's interaction: a. sign in, b. search other users, c. invite a user to chat, d. send private messages, e. make a group conversation, f. share files, g. enhance file sharing with a P2P alternative (which I wasn't able to figure out).

For every feature as well, I started with the UI/client, before implementing the feature backend-side.

This method allowed me to test each new feature without having to write any scaffolding code.


##### Implementation Log

1. Nov 22: I got started using the chat example featured on socket-io's website. I'd seen this example somewhere else, and since it said it supported binary content (streams) I figured it would do the job perfectly.

2. Nov 23: After the jump start thanks to the tutorial, I had to dig deeper and understand how the chat server, and especially sockets really work. Different methods are used for different versions, and that was confusing for a Node.js and Socket.io newbie. A: silly example: how to source static content. (Socket.io's is just socket.io/socket.io-client.js, which not being at all the actual path really puzzled me as a Node.js beginner.) On the socket.io side, how do you send a private message from one user to another?

3. Nov 24: Implemented sign in + first schema for tracking users in the server.

4. Nov 25: Client: added search panel and inviting users using drag and drop. Backend: implemented 'search' feature

5. Nov 26: Updated the data structures used in order to support group chat more easily. Fully implemented private chat. Implemented group chat.

6. Nov 27: Added group chat limit, including notifications when a group size limit (this was tricky because a user could send 10 invitations in a row, so we need to check both when before sending and after the invite has been accepted by the peer). Also added fixes to the the chat invite invite process in general: for instance, a user may attempt to send an invitation to another user who's gone offline, or, inversely, a user may accept an invitation after the other user went offline. I also fixed the search/update lobby feature, so that a user's own name won't show in the pannel. Finally, I also fixed the UI, so that the chat window would allow scrolling, use a different color for user's own messages.

7. Nov 28: Code refactoring. Implemented ban feature (including /admin page). App deployment.

8. Nov 29: Implemented file sharing. Fixed ban feature (I had a lot of trouble finding the correct method to get a user's IP. To make things work, one method would work locally but not online, while another worked online but not locally. However combining both it now works perfectly).  

9. Nov 30: Added a file size limit based on tests. Tried to establish a P2P connection.


##### To Do

1. P2P file sharing: when a user attempts to share a file, he/she should first try to setup a P2P connection with each peer. This process is mediated by the server, who sends back the peer's IP addresses. However, this connection could fail because of the peer's firewall, in which case the server should be notified. The server then tells the peer to initiate a P2P connection to the user. If both attempts at establishing a P2P connection fail, the file sharing process should fall back to going through the server.

2. File sharing: I am currently sending a dataURI in "one piece" (as far as the application layer is concerned). It would be a good idea to try using a stream, which would be more memory efficient and faster because each (stream) segment could be forwarded on to the peer immediately, instead of the current implementation that waits for the full data URI. This would also probably allow to send larger files (currently breaks down ~ 5MB).

3. Restructurating: I am new to Node.js so I didn't (know how to) do this, but I should restructure the app, using different layers of abstractions, so that each function call and each function only has a few lines of codes and it's easy to have a clear understanding of what it does and we can get an immediate overview of what the app does in app.js (which for instance woud be reduced to < 100 lines).
