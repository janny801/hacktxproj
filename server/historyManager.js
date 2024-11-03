const fs = require("fs");
const path = require("path");

const maxHistoryLength = 10;
const chatHistory = {};
const uploadsDirectory = path.join(__dirname, "uploads"); // Path to the uploads folder

// Ensure the uploads directory exists
if (!fs.existsSync(uploadsDirectory)) {
    fs.mkdirSync(uploadsDirectory);
}

function addMessageToHistory(userId, message) {
    if (!chatHistory[userId]) {
        chatHistory[userId] = [];
    }
    chatHistory[userId].push(message);

    // Limit the history size
    if (chatHistory[userId].length > maxHistoryLength) {
        chatHistory[userId].shift(); // Remove the oldest message
    }
}

function addFileToHistory(userId, filePath) {
    if (!chatHistory[userId]) {
        chatHistory[userId] = [];
    }
    const fileName = path.basename(filePath);
    const fileUrl = `/uploads/${fileName}`;
    chatHistory[userId].push({ sender: "User", content: `Uploaded file: ${fileUrl}` });

    // Limit the history size
    if (chatHistory[userId].length > maxHistoryLength) {
        chatHistory[userId].shift(); // Remove the oldest message
    }
}

function getChatHistory(userId) {
    return chatHistory[userId] || [];
}

function clearChatHistory(userId) {
    delete chatHistory[userId];
}

module.exports = { addMessageToHistory, addFileToHistory, getChatHistory, clearChatHistory };


