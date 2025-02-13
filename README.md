# HackTX Project - AI Chat and PDF Summarizer

An AI-driven chat and PDF summarization tool built for real-time interactions using OpenAI's API. This project enables live conversations with AI-assisted responses and dynamic PDF analysis.

## Features
- **Real-Time AI Chat**: Engages users in live conversations with AI-driven responses.
- **PDF Summarization**: Uploads and processes PDF documents to extract key insights.
- **Context-Aware Responses**: Utilizes OpenAI’s API for intelligent and adaptive responses.
- **User Data Storage**: Saves previous interactions for improved AI context retention.
- **Secure File Uploads**: Uses `multer` for handling file uploads.

## Technologies Used
🔧 **Tech Stack**:
- **Backend**: Node.js, Express, Socket.IO, OpenAI API
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
