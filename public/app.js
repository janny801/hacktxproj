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

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");

    const files = e.dataTransfer.files;
    if (files.length) {
        const formData = new FormData();
        formData.append("file", files[0]);

        fetch("/upload", {
            method: "POST",
            body: formData
        })
        .then(response => response.text())
        .then(message => {
            console.log(message);
            const li = document.createElement("li");
            li.textContent = message;
            ul.appendChild(li);
        })
        .catch(error => console.error("File upload failed:", error));
    }
});