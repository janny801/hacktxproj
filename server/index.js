const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

// Track the number of users
let userCount = 0;

app.use(express.static(__dirname + '/../public'));

io.on('connection', (socket) => {
    // Increment user count and assign a username
    userCount++;
    const username = `User ${userCount}`;

    // Send the username to the specific client who just connected
    socket.emit('your-username', username);

    // Notify all clients when a new user connects
    io.emit('message', `${username} has joined the chat`);
    console.log(`${username} connected`);

    // Listen for 'message' event from the client
    socket.on('message', (message) => {
        console.log(`Message received from ${username}:`, message);
        io.emit('message', `${username} said: ${message}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`${username} disconnected`);
        io.emit('message', `${username} has left the chat`);
    });
});

http.listen(8080, () => {
    console.log('Server is listening on http://localhost:8080');
});
