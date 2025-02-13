# AI Chat and PDF Summarizer (HackTX 2024)

This project was developed as part of the **HackTX 2024 hackathon** by a **team of four**. It is an AI-powered chat and PDF summarization tool that leverages **OpenAI's GPT-4 Turbo API** to provide **real-time AI-assisted responses** and **context-aware PDF parsing**. The goal was to create an interactive system that allows users to engage in live conversations while also uploading and summarizing documents for quick insights.

##  Features
- **Real-Time AI Chat** – Users can engage in live AI-powered conversations, receiving responses tailored to context.
- **PDF Summarization** – Upload PDF documents for AI-driven content summarization.
- **User Data Storage** – Maintains chat history and extracts key details for enhanced responses.
- **Collaborative Development** – Designed and built by a team of four, focusing on backend, frontend, and AI model integration.


## Technologies Used
🔧 **Tech Stack**:
- **Backend**: Node.js, Express.js, Socket.IO, OpenAI API
- **Frontend**: HTML, CSS, JavaScript
- **File Handling**: Multer for handling file uploads

## Installation & Setup

To run the project locally, follow these steps:

```bash
# Clone the repository
git clone https://github.com/janny801/hacktxproj.git
cd hacktxproj

# Navigate to the server directory
cd server

# Install dependencies
npm install

# Install Multer for file handling
npm install multer

# Start the server
npm start
