streamChat
==========

streamChat is a Node.js browser chat web application.
streamChat uses socket.io for real-time communications between users, and used the demo http://socket.io/get-started/chat/ as a boilerplate.

**CURRENTLY IN DEVELOPMENT**

### Features
 - [x] one on one chat
 - [x] group chat (up to 5 peope)
 - [x] look up online users
 - [ ] ban users
 - [ ] image/video sharing

### Technology

##### Backend:
  - Node.js + Express
  - socket.io-server
  
##### Frontend:
  - socket.io-client
  - jQuery


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
node app.js
```
Which should display:
```
listening on *:3000
```
To start using the chat app, open your browser at http://localhost:3000/

Happy chatting!





