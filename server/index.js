require('dotenv').config(); // Load environment variables
console.log('All Environment Variables:', process.env); // Log all environment variables
console.log('API Key Loaded:', process.env.OPENAI_API_KEY); // Log the specific API key

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');

//test
console.log('API Key:', process.env.OPENAI_API_KEY);
//test

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
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
    socket.on('message', async (message) => {
        const username = users[socket.id]; // Get the username for this socket
        console.log(`Message received from ${username}:`, message);
        io.emit('message', `${username} said: ${message}`);

        // Call OpenAI API to get a response
        try {
            const response = await getOpenAIResponse(message);
            io.emit('message', response); // Send the response directly to users without prefix
        } catch (error) {
            console.error('Error fetching OpenAI response:', error);
            io.emit('message', 'Error: Could not retrieve response from OpenAI.');
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const username = users[socket.id];
        console.log(`${username} disconnected`);
        io.emit('message', `${username} has left the chat`);
        delete users[socket.id]; // Clean up the username
    });
});

// Function to call OpenAI API
async function getOpenAIResponse(userMessage) {
    const apiKey = process.env.OPENAI_API_KEY; // Access the API key from environment variables

    // Customize your prompt here to request a response in the style of Shakespeare
    const prompt = `Respond to the following message as Shakespeare:\nUser message: ${userMessage}`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-3.5-turbo", // Specify the model
        messages: [
            { role: "user", content: prompt } // Send the customized prompt
        ],
    }, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
    });

    return response.data.choices[0].message.content; // Return the response from OpenAI
}

server.listen(8080, () => {
    console.log('Server is listening on http://localhost:8080');
});
