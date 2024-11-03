const socket = io('http://localhost:8080');
console.log('Connecting to Socket.IO...');

// Prompt the user for their username
const username = prompt("Enter your username:");

// Emit the username to the server
socket.emit('set-username', username);

// Display the username of the connected user
socket.on('your-username', (username) => {
    const userInfo = document.createElement('p');
    userInfo.textContent = `You are ${username}`;
    userInfo.style.color = '#fff';
    document.body.insertBefore(userInfo, document.querySelector('ul'));
});

// Query the DOM for necessary elements
const input = document.querySelector('input');
const button = document.querySelector('button');
const ul = document.querySelector('ul');

// Send message when button is clicked
button.addEventListener('click', () => {
    const message = input.value;
    console.log('Sending message:', message);
    socket.emit('message', message);
    input.value = '';
});

// Listen for messages from the server and append them to the list
socket.on('message', (message) => {
    console.log('Received message:', message);
    const li = document.createElement('li');
    li.textContent = message;
    ul.appendChild(li);
});


// Drag and Drop File Upload
const dropZone = document.getElementById("drop-zone");
const messageList = document.getElementById("message-list");
const imageSection = document.getElementById("image-section");
const imageContainer = document.getElementById("image-container");

// Add placeholder text initially
const placeholderText = document.createElement("p");
placeholderText.className = "placeholder";
placeholderText.textContent = "Upload image here";
imageContainer.appendChild(placeholderText);

// Handle drag and drop events to change appearance
document.addEventListener("dragover", (e) => {
    e.preventDefault();
    imageSection.classList.add("drag-over"); // Darken the image section
});

document.addEventListener("dragleave", (e) => {
    e.preventDefault();
    imageSection.classList.remove("drag-over"); // Remove darkened effect
});

document.addEventListener("drop", (e) => {
    e.preventDefault();
    imageSection.classList.remove("drag-over"); // Remove darkened effect

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

                // Clear the image container and remove placeholder text
                imageContainer.innerHTML = ''; // Clear previous content
                
                // Display the image
                if (file.type.startsWith("image/")) {
                    const img = document.createElement("img");
                    img.src = data.url;
                    img.alt = file.name;
                    imageContainer.appendChild(img);
                    
                    // Display the file name below the image
                    const fileName = document.createElement("p");
                    fileName.className = "file-name";
                    fileName.textContent = file.name;
                    imageContainer.appendChild(fileName);
                } else {
                    // Display a link if the uploaded file is not an image
                    const link = document.createElement("a");
                    link.href = data.url;
                    link.textContent = `View ${file.name}`;
                    link.target = "_blank";
                    imageContainer.appendChild(link);
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
