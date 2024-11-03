require('dotenv').config(); // Load environment variables

//console.log('All Environment Variables:', process.env); // Log all environment variables
console.log('API Key Loaded:', process.env.OPENAI_API_KEY); // Log the specific API key
const apiKey = process.env.OPENAI_API_KEY;

console.log("API KEY: " ,apiKey); //display api key 

const express = require('express');
const http = require('http');
const multer = require('multer');

const socketIo = require('socket.io');
const axios = require('axios');
const upload = multer({ dest: 'uploads/' }); // Save files to the "uploads" directory


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }
});


// Handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
    if (req.file) {
        console.log('File received:', req.file.originalname);
        res.send('File received');
    } else {
        res.status(400).send('No file uploaded');
    }
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
        socket.emit('your-username', username);
    });

    // Listen for 'message' event from the client
    socket.on('message', async (message) => {
        const username = users[socket.id];
        console.log(`Message received from ${username}:`, message);
        io.emit('message', `${username} said: ${message}`);

        try {
            const response = await getOpenAIResponse(message);
            io.emit('message', response);
        } catch (error) {
            console.error('Error fetching OpenAI response:', error);

            if (error.response && error.response.status === 429) {
                io.emit('message', 'Error: Rate limit exceeded. Please try again later.');
            } else {
                io.emit('message', 'Error: Could not retrieve response from OpenAI.');
            }
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const username = users[socket.id];
        console.log(`${username} disconnected`);
        io.emit('message', `${username} has left the chat`);
        delete users[socket.id];
    });
});

// Function to call OpenAI API
async function getOpenAIResponse(userMessage) {
    const apiKey = process.env.OPENAI_API_KEY;

    const prompt = `Respond to the following message as Shakespeare:\nUser message: ${userMessage}`;

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo", // Use the correct model name here
            messages: [{ role: "user", content: prompt }],
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error fetching OpenAI response:', error.response ? error.response.data : error.message);
        throw new Error('Could not retrieve response from OpenAI.');
    }
}

server.listen(8080, () => {
    console.log('Server is listening on http://localhost:8080');
});
