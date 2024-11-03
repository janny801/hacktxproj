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
const messageList = document.querySelector("ul"); // Renamed 'ul' to 'messageList'

// Prevent default browser behavior for drag-and-drop events at the document level
document.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
});

document.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
});

document.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");

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
        .then(response => response.text())
        .then(message => {
            // Update the message once the file is successfully uploaded
            li.textContent = `Uploaded: ${file.name}`;
            console.log(message);
        })
        .catch(error => {
            console.error("File upload failed:", error);
            li.textContent = `Failed to upload: ${file.name}`;
        });
    }
});
