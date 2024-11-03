const socket = io('http://localhost:8080');
console.log('Connecting to Socket.IO...');

// Query the DOM for necessary elements
const usernameInput = document.getElementById("username-input");
const usernameSubmit = document.getElementById("username-submit");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const messageList = document.getElementById('message-list');
const dropZone = document.getElementById("image-section");
const fileContainer = document.getElementById("image-container");
const usernameOverlay = document.getElementById("username-overlay");
const loadingSpinner = document.createElement('div');
loadingSpinner.classList.add('spinner');
loadingSpinner.innerHTML = '<div class="lds-dual-ring"></div>';
document.body.appendChild(loadingSpinner); // Add spinner to the body

// Variable to store the username locally
let username = "";

// Hide the spinner by default
loadingSpinner.style.display = 'none';

// Show spinner on 'thinking' event
socket.on('thinking', () => {
    console.log("OpenAI is thinking...");
    loadingSpinner.style.display = 'block'; // Show spinner
});

// Hide spinner on 'response' event and display the message as AI response
socket.on('ai-message', (data) => {
    console.log("AI has responded:", data.content);
    loadingSpinner.style.display = 'none'; // Hide spinner

    const li = document.createElement('li');
    li.classList.add("ai-message"); // Apply left-side styling for AI messages
    li.innerHTML = data.content.replace(/\n/g, '<br>');
    messageList.appendChild(li);
    messageList.scrollTop = messageList.scrollHeight; // Auto-scroll to the bottom
});

// Set up the username and trigger welcome message
usernameSubmit.addEventListener("click", () => {
    const enteredUsername = usernameInput.value.trim();
    if (enteredUsername) {
        username = enteredUsername; // Store the username locally
        socket.emit("set-username", username);
        
        // Emit welcome event to trigger the welcome message from AI
        socket.emit("welcome");

        // Hide the username overlay directly
        usernameOverlay.style.display = "none";

        // Enable the message input and send button
        messageInput.disabled = false;
        sendButton.disabled = false;
    } else {
        alert("Please enter a username.");
    }
});

// Send message when button is clicked
sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        const li = document.createElement('li');
        li.classList.add("user-message"); // Apply right-side styling for user messages
        li.innerHTML = `${username}: ${message}`; // Display the username instead of "You"
        messageList.appendChild(li);
        messageList.scrollTop = messageList.scrollHeight; // Auto-scroll to the bottom

        // Send the message data to the server with sender information
        socket.emit('message', message);
        messageInput.value = '';
    }
});

// Listen for user messages from the server and apply appropriate styling
socket.on('user-message', (data) => {
    const li = document.createElement('li');
    // If the message is from the current user, apply user-message styling
    if (data.sender === username) {
        li.classList.add("user-message");
    } else {
        // For other users or AI, apply ai-message styling
        li.classList.add("ai-message");
    }
    li.innerHTML = `${data.sender}: ${data.content}`;
    messageList.appendChild(li);
    messageList.scrollTop = messageList.scrollHeight; // Auto-scroll to the bottom
});

// Drag and Drop File Upload
const placeholderText = document.createElement("p");
placeholderText.className = "placeholder";
placeholderText.textContent = "Upload PDF here";
fileContainer.appendChild(placeholderText);

// Function to update placeholder text
function setPlaceholderText(text) {
    placeholderText.textContent = text;
}

// Handle drag over events
dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over"); // Darken the image section
    setPlaceholderText("Drop your PDF here"); // Change text when hovering
});

// Handle drag leave events
dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over"); // Remove darkened effect
    setPlaceholderText("Upload PDF here"); // Revert text when leaving
});

// Handle drop events
dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over"); // Remove darkened effect
    setPlaceholderText("Upload PDF here"); // Reset text after drop

    const files = e.dataTransfer.files;
    if (files.length) {
        const file = files[0];
        const formData = new FormData();
        formData.append("file", file);

        // Display the file name in the chat
        const li = document.createElement("li");
        li.classList.add("user-message"); // Apply right-side styling for user upload messages
        li.textContent = `Uploading: ${file.name}`;
        messageList.appendChild(li);

        // Fetch call with socket ID as a custom header
        fetch("/upload", {
            method: "POST",
            headers: {
                "socket-id": socket.id // Pass the socket ID in headers
            },
            body: formData
        })
        .then(response => response.json())  // Expecting JSON with file URL
        .then(data => {
            if (data.url) {  // Server response with the file URL
                li.textContent = `Uploaded: ${file.name}`;

                // Clear the file container and remove placeholder text
                fileContainer.innerHTML = ''; // Clear previous content
                
                if (file.type.startsWith("image/")) {
                    const img = document.createElement("img");
                    img.src = data.url;
                    img.alt = file.name;
                    img.style.maxWidth = "100%";
                    img.style.maxHeight = "100%";
                    fileContainer.appendChild(img);
                } else if (file.type === "application/pdf") {
                    // Render PDF using PDF.js
                    renderPDF(data.url);
                } else {
                    const link = document.createElement("a");
                    link.href = data.url;
                    link.textContent = `View ${file.name}`;
                    link.target = "_blank";
                    fileContainer.appendChild(link);
                }
            } else {
                li.textContent = `Failed to upload: ${file.name}`;
            }
        })
        .catch(error => {
            console.error("File upload failed:", error);
            li.textContent = `Failed to upload: ${file.name}`;
        });
    }
});


// Function to render PDF using PDF.js
function renderPDF(url) {
    const canvas = document.createElement("canvas");
    fileContainer.innerHTML = ''; // Clear previous content
    fileContainer.appendChild(canvas);
    const context = canvas.getContext("2d");

    pdfjsLib.getDocument(url).promise.then((pdfDoc) => {
        pdfDoc.getPage(1).then((page) => {
            const viewport = page.getViewport({ scale: 1.2 }); // Adjust scale to fit

            // Set canvas dimensions to fit the container
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.maxWidth = "100%";
            canvas.style.maxHeight = "100%";
            canvas.style.border = "1px solid #ccc"; // Optional border for clarity

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };
            page.render(renderContext);
        });
    }).catch((error) => {
        console.error("Error rendering PDF:", error);
        fileContainer.innerHTML = `<p>Failed to load PDF.</p>`;
    });
}
