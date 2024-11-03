const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

const maxHistoryLength = 10;
const chatHistory = {};
const uploadsDirectory = path.join(__dirname, "uploads");

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
    console.log(`addMessageToHistory(${userId}, ${JSON.stringify(message)}) called`);
    console.log("Updated chat history:", JSON.stringify(chatHistory[userId], null, 2));
}

async function addFileToHistory(userId, filePath) {
    if (!chatHistory[userId]) {
        chatHistory[userId] = [];
    }

    const fileName = path.basename(filePath);
    const fileUrl = `/uploads/${fileName}`;

    if (filePath.endsWith(".pdf")) {
        try {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            const fileContent = pdfData.text;

            chatHistory[userId].push({
                sender: "User",
                content: `Uploaded file: ${fileUrl} \nExtracted Content:\n${fileContent}`
            });
            console.log(`addFileToHistory(${userId}, ${filePath}): PDF content added`);
        } catch (error) {
            console.error("Error parsing PDF file:", error);
            chatHistory[userId].push({
                sender: "User",
                content: `Uploaded file: ${fileUrl} (could not extract content)`
            });
        }
    } else {
        chatHistory[userId].push({
            sender: "User",
            content: `Uploaded file: ${fileUrl} (non-PDF file)`
        });
    }

    // Limit the history size
    if (chatHistory[userId].length > maxHistoryLength) {
        chatHistory[userId].shift(); // Remove the oldest message
    }
    console.log("Chat history after adding file:", JSON.stringify(chatHistory[userId], null, 2));
}

function getChatHistory(userId) {
    console.log("Current chat history for user:", JSON.stringify(chatHistory[userId] || [], null, 2));
    return chatHistory[userId] || [];
}

function clearChatHistory(userId) {
    delete chatHistory[userId];
    console.log(`Chat history cleared for user ${userId}`);
}

module.exports = { addMessageToHistory, addFileToHistory, getChatHistory, clearChatHistory };
