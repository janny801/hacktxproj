const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

// Track connected users
let users = {};

app.use(express.static(__dirname + '/../public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Listen for the 'set-username' event from the client
    socket.on('set-username', (username) => {
        users[socket.id] = username; // Store the username with the socket ID
        io.emit('message', `${username} has joined the chat`);
        console.log(`${username} connected`);

        // Send the username to the specific client who just connected
        socket.emit('your-username', username);
    });

    // Listen for 'message' event from the client
    socket.on('message', (message) => {
        const username = users[socket.id]; // Get the username for this socket
        console.log(`Message received from ${username}:`, message);
        io.emit('message', `${username} said: ${message}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const username = users[socket.id];
        console.log(`${username} disconnected`);
        io.emit('message', `${username} has left the chat`);
        delete users[socket.id]; // Clean up the username
    });
});

http.listen(8080, () => {
    console.log('Server is listening on http://localhost:8080');
});
