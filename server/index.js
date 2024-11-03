require("dotenv").config(); // Load environment variables

const express = require("express");
const http = require("http");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const socketIo = require("socket.io");
const axios = require("axios");
const pdfParse = require("pdf-parse");
const { addMessageToHistory, getChatHistory, clearChatHistory } = require("./historyManager");

const apiKey = process.env.OPENAI_API_KEY;
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

const upload = multer({ dest: "uploads/" });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(__dirname + "/../public"));

let users = {};

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("set-username", (username) => {
        users[socket.id] = username;
        io.emit("user-status", { username, status: "joined" });
        socket.emit("your-username", username);

        const welcomeMessage = "Hello! Thank you for checking out my website. Feel free to upload a PDF file that you want to discuss, and I’ll help analyze it for you!";
        socket.emit("ai-message", { sender: "AI", content: welcomeMessage });
    });

    socket.on("message", async (message) => {
        const username = users[socket.id];
        console.log(`Message received from ${username}:`, message);

        addMessageToHistory(socket.id, { sender: username, content: message });
        console.log(`addMessageToHistory(socket.id, { sender: username, content: message }) = { sender: "${username}", content: "${message}" }`);
        console.log("Chat history after adding user message:", getChatHistory(socket.id));

        const chatContext = getChatHistory(socket.id);

        try {
            io.emit("thinking");
            const response = await getOpenAIResponse(message, "text", chatContext);
            addMessageToHistory(socket.id, { sender: "AI", content: response });
            console.log(`addMessageToHistory(socket.id, { sender: "AI", content: response }) = { sender: "AI", content: "${response}" }`);
            console.log("Chat history after adding AI response:");
            getChatHistory(socket.id).forEach((message, index) => {
                console.log(`Message ${index + 1}:`, JSON.stringify(message, null, 2));
            });
            socket.emit("ai-message", { sender: "AI", content: response });
        } catch (error) {
            handleError(error, io, "text");
        }
    });

    socket.on("disconnect", () => {
        const username = users[socket.id];
        io.emit("user-status", { username, status: "left" });
        delete users[socket.id];
        clearChatHistory(socket.id);

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

app.post("/upload", upload.single("file"), async (req, res) => {
    if (req.file) {
        const fileUrl = `/uploads/${req.file.filename}`;
        const filePath = req.file.path;
        io.emit("message", `File uploaded: ${fileUrl}`);

        try {
            io.emit("thinking");

            if (req.file.mimetype === "application/pdf") {
                const dataBuffer = fs.readFileSync(filePath);
                const pdfData = await pdfParse(dataBuffer);

                const concatenatedPdfText = pdfData.text.replace(/\n+/g, " ");
                addMessageToHistory(req.file.filename, { sender: "User", content: concatenatedPdfText, type: "pdf-content" });
                console.log(`addMessageToHistory(req.file.filename, { sender: "User", content: concatenatedPdfText }) = { sender: "User", content: "${concatenatedPdfText}" }`);
                console.log("Chat history after adding concatenated PDF content as User message:", getChatHistory(req.file.filename));

                const responseMessage = await getOpenAIResponse(concatenatedPdfText, "pdf");

                const formattedResponseMessage = responseMessage.replace(/(\. )/g, ".\n");

                addMessageToHistory(req.file.filename, { sender: "AI", content: responseMessage, type: "pdf-summary" });
                console.log(`addMessageToHistory(req.file.filename, { sender: "AI", content: responseMessage }) = { sender: "AI", content: "${responseMessage}" }`);
                console.log("Chat history after adding AI response:");
                getChatHistory(req.file.filename).forEach((message, index) => {
                    console.log(`Message ${index + 1}:`, JSON.stringify(message, null, 2));
                });

                // Emit the response with a small delay to ensure proper processing
                setTimeout(() => {
                    io.emit("ai-message", { sender: "AI", content: formattedResponseMessage, type: "pdf-summary" });
                }, 500);

                res.json({ url: fileUrl });
            } else {
                const responseMessage = await getOpenAIResponse(filePath, "image");
                io.emit("ai-message", { sender: "AI", content: responseMessage });
                res.json({ url: fileUrl });
            }
        } catch (error) {
            handleError(error, io, req.file.mimetype === "application/pdf" ? "pdf" : "image");
            res.status(500).json({ error: "Error processing file" });
        }
    } else {
        res.status(400).json({ error: "No file uploaded" });
    }
});

async function getOpenAIResponse(input, type, history = []) {
    let prompt;

    if (type === "text") {
        const historyContext = history.map(msg => `${msg.sender}: ${msg.content}`).join("\n");
        prompt = `You are a helpful assistant. Here is the chat history:\n${historyContext}\n\nUser message: ${input}\nRespond with memory of recent messages, while being helpful and engaging.`;
    } else if (type === "pdf") {
        prompt = `Summarize the following PDF content with concise sentences or statements. Separate different topics or sections with new lines (that leave one line completely blank) to make it easy to read in the chat. Preferably make your response shorter than 35 words (not in bullet points) and then ask if the user wants to elaborate on something specific:\n${input}`;
    } else if (type === "image") {
        prompt = `I'm unable to view images directly. Please describe the contents of the image, or if you have additional context, share it in a PDF for better assistance.\n${input}`;
    }

    console.log("Constructed Prompt for OpenAI API:\n", prompt);
    console.log("History Context:\n", history.map(msg => `${msg.sender}: ${msg.content}`).join("\n"));
    console.log("User Input:\n", input);

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
