require("dotenv").config(); // Load environment variables

console.log("API Key Loaded:", process.env.OPENAI_API_KEY); // Log the specific API key

const express = require("express");
const http = require("http");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const socketIo = require("socket.io");
const axios = require("axios");
const pdfParse = require("pdf-parse"); // Import pdf-parse

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

// Socket.io connection for real-time chat
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Listen for the 'set-username' event from the client
  socket.on("set-username", (username) => {
    users[socket.id] = username; // Store the username with the socket ID
    io.emit("message", `${username} has joined the chat`);
    console.log(`${username} connected`);
    socket.emit("your-username", username);
  });


// Listen for 'message' event from the client (text input)
socket.on("message", async (message) => {
  const username = users[socket.id];
  console.log(`Message received from ${username}:`, message);

  // Emit the user message to other clients only
  socket.broadcast.emit("other-user-message", { sender: username, content: message });

  try {
      io.emit("thinking"); // Emit "thinking" event to show the spinner on the client
      const response = await getOpenAIResponse(message, "text");
      io.emit("ai-message", { content: response }); // Emit AI response to all clients
  } catch (error) {
      handleError(error, io, "text");
  }
});


  // Handle disconnection
  socket.on("disconnect", () => {
    const username = users[socket.id];
    console.log(`${username} disconnected`);
    io.emit("message", `${username} has left the chat`);
    delete users[socket.id];
  });
});

// Handle file upload (text, image, or PDF)
app.post("/upload", upload.single("file"), async (req, res) => {
  if (req.file) {
    const fileUrl = `/uploads/${req.file.filename}`;
    const filePath = req.file.path;
    io.emit("message", `File uploaded: ${fileUrl}`);

    try {
      io.emit("thinking"); // Show spinner for file uploads as well

      let responseMessage;
      if (req.file.mimetype === "application/pdf") {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        responseMessage = await getOpenAIResponse(pdfData.text, "pdf");
      } else {
        responseMessage = await getOpenAIResponse(filePath, "image");
      }

      io.emit("ai-message", { sender: "AI", content: responseMessage }); // AI's response
      res.json({ url: fileUrl });
    } catch (error) {
      handleError(error, io, req.file.mimetype === "application/pdf" ? "pdf" : "image");
      res.status(500).json({ error: "Error processing file" });
    }
  } else {
    res.status(400).json({ error: "No file uploaded" });
  }
});

// Function to call OpenAI API
async function getOpenAIResponse(input, type) {
  let prompt;
  if (type === "text") {
    prompt = `Respond to the following message as if you are Shakespeare:\nUser message: ${input}`;
  } else if (type === "pdf") {
    prompt = `Summarize the following PDF content with concise paragraphs. Separate different topics or sections with new lines to make it easy to read in the chat:\n${input}`;
  } else if (type === "image") {
    prompt = `Describe the contents of this image"\n${input}`;
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
