streamChat
==========

streamChat is a Node.js browser based chat application, available here: https://stream-chat-plus.herokuapp.com/

streamChat uses socket.io for real-time communications between users.

I used the following demo http://socket.io/get-started/chat/ as a boilerplate.

Moreover, I also relied on Craig Buckler's tutorial http://www.sitepoint.com/html5-file-drag-and-drop/ in order to help me with file uploads.


**CURRENTLY IN DEVELOPMENT**

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
