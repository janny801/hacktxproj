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

// Function to set up the username
usernameSubmit.addEventListener("click", () => {
    console.log("Submit button clicked");
    const username = usernameInput.value.trim();
    if (username) {
        socket.emit("set-username", username);
        console.log("Username entered:", username);
        
        // Hide the username overlay directly
        usernameOverlay.style.display = "none";
        console.log("Hiding the overlay...");

        // Enable the message input and send button
        messageInput.disabled = false;
        sendButton.disabled = false;
    } else {
        alert("Please enter a username.");
    }
});

// Listen for the username confirmation from the server and hide the overlay
socket.on("your-username", (username) => {
    if (username) {
        console.log("Received confirmation for username:", username);
        usernameOverlay.style.display = "none"; // Hide the overlay directly
        messageInput.disabled = false;          // Enable message input
        sendButton.disabled = false;            // Enable send button
    }
});

// Rest of your `app.js` code (message sending, file upload, etc.)...



// Send message when button is clicked
sendButton.addEventListener('click', () => {
    const message = messageInput.value;
    console.log('Sending message:', message);
    socket.emit('message', message);
    messageInput.value = '';
});

// Listen for messages from the server and append them to the list
socket.on('message', (message) => {
    console.log('Received message:', message);
    const li = document.createElement('li');
    li.innerHTML = message.replace(/\n/g, '<br>');
    messageList.appendChild(li);
});

// Drag and Drop File Upload
// Add placeholder text initially
const placeholderText = document.createElement("p");
placeholderText.className = "placeholder";
placeholderText.textContent = "Upload image here";
fileContainer.appendChild(placeholderText);

// Function to update placeholder text
function setPlaceholderText(text) {
    placeholderText.textContent = text;
}

// Handle drag over events
dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over"); // Darken the image section
    setPlaceholderText("Drop your image here"); // Change text when hovering
});

// Handle drag leave events
dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over"); // Remove darkened effect
    setPlaceholderText("Upload image here"); // Revert text when leaving
});

// Handle drop events
dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over"); // Remove darkened effect
    setPlaceholderText("Upload image here"); // Reset text after drop

    const files = e.dataTransfer.files;
    if (files.length) {
        const file = files[0];
        const formData = new FormData();
        formData.append("file", file);

        // Display the file name in the chat
        const li = document.createElement("li");
        li.textContent = `Uploading: ${file.name}`;
        messageList.appendChild(li);

        fetch("/upload", {
            method: "POST",
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
