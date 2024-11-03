// Load environment variables
require("dotenv").config(); 

const express = require("express");
const http = require("http");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const socketIo = require("socket.io");
const axios = require("axios");
const pdfParse = require("pdf-parse"); 
const { addMessageToHistory, getChatHistory, clearChatHistory } = require("./historyManager"); // Import history manager module

const apiKey = process.env.OPENAI_API_KEY;
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

const upload = multer({ dest: "uploads/" }); // Save files to the "uploads" directory

// Serve static files from the 'uploads' directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Track connected users
let users = {};

// Serve the static files for the chat interface
app.use(express.static(__dirname + "/../public"));

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Handle the set-username event
    socket.on("set-username", (username) => {
        users[socket.id] = username;
        io.emit("user-status", { username, status: "joined" });
        socket.emit("your-username", username);

        // Send a welcome message after username is set
        const welcomeMessage = "Hello! Thank you for checking out my website. Feel free to upload a PDF file that you want to discuss, and I’ll help analyze it for you!";
        socket.emit("ai-message", { sender: "AI", content: welcomeMessage });
    });

    // Listen for 'message' event from the client (text input)
    socket.on("message", async (message) => {
        const username = users[socket.id];
        console.log(`Message received from ${username}:`, message);

        // Add user message to chat history
        addMessageToHistory(socket.id, { sender: username, content: message });

        try {
            io.emit("thinking"); // Emit "thinking" event to show the spinner on the client

            // Retrieve chat context to provide memory for the AI
            const chatContext = getChatHistory(socket.id);

            const response = await getOpenAIResponse(message, "text", chatContext);

            // Add AI response to chat history
            addMessageToHistory(socket.id, { sender: "AI", content: response });

            socket.emit("ai-message", { sender: "AI", content: response });
        } catch (error) {
            handleError(error, io, "text");
        }
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
        const username = users[socket.id];
        io.emit("user-status", { username, status: "left" });
        delete users[socket.id];
        clearChatHistory(socket.id); // Clear chat history on disconnect

        // Delete all files in the uploads directory when user disconnects
        fs.readdir(path.join(__dirname, "uploads"), (err, files) => {
            if (err) throw err;
            for (const file of files) {
                fs.unlink(path.join(__dirname, "uploads", file), err => {
                    if (err) throw err;
                });
            }
        });
    });
});

// Handle file upload (only PDFs)
app.post("/upload", upload.single("file"), async (req, res) => {
    if (req.file) {
        const fileUrl = `/uploads/${req.file.filename}`;
        const filePath = req.file.path;
        io.emit("message", `File uploaded: ${fileUrl}`);

        try {
            io.emit("thinking"); // Show spinner for file uploads as well

            if (req.file.mimetype === "application/pdf") {
                const dataBuffer = fs.readFileSync(filePath);
                const pdfData = await pdfParse(dataBuffer);
                const responseMessage = await getOpenAIResponse(pdfData.text, "pdf");

                io.emit("ai-message", { sender: "AI", content: responseMessage });
                res.json({ url: fileUrl });
            } else {
                io.emit("ai-message", { sender: "AI", content: "I'm sorry, I can only process PDF files. Please upload a PDF." });
                res.status(400).json({ error: "Unsupported file type" });
            }
        } catch (error) {
            handleError(error, io, req.file.mimetype === "application/pdf" ? "pdf" : "image");
            res.status(500).json({ error: "Error processing file" });
        }
    } else {
        res.status(400).json({ error: "No file uploaded" });
    }
});

// Function to call OpenAI API with chat history for memory
async function getOpenAIResponse(input, type, history = []) {
    let prompt;
    
    if (type === "text") {
        // Include recent chat history for context
        const historyContext = history.map(msg => `${msg.sender}: ${msg.content}`).join("\n");
        prompt = `You are a helpful assistant. Here is the chat history so far:\n${historyContext}\n\nUser message: ${input}\nPlease respond to the user as if you remember recent messages, while being helpful and engaging.`;
    } else if (type === "pdf") {
        prompt = `Summarize the following PDF content with concise sentences or statements. Separate different topics or sections with new lines to make it easy to read in the chat. Preferably make your response shorter and then ask the user if they would like to elaborate on something specific within that file:\n${input}`;
    } else if (type === "image") {
        prompt = `I'm unable to view images directly, but if you can send the content in a PDF format, I'd be happy to review it with you.`;
    }

    try {
        const data = {
            model: "gpt-4-turbo",
            messages: [{ role: "user", content: prompt }],
        };

        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            data,
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Error fetching OpenAI response:", error.response ? error.response.data : error.message);
        throw new Error("Could not retrieve response from OpenAI.");
    }
}

// Error handling function
function handleError(error, io, type) {
    console.error("Error fetching OpenAI response:", error);

    if (error.response && error.response.status === 429) {
        io.emit("message", `Error: Rate limit exceeded. Please try again later.`);
    } else if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
        io.emit("message", `Error: ${error.response.data.error.message}`);
    } else {
        io.emit("message", `Error: Could not retrieve response from OpenAI.`);
    }
}

server.listen(8080, () => {
    console.log("Server is listening on http://localhost:8080");
});
