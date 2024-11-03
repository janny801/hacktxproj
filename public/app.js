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
    // Replace \n with <br> to ensure line breaks display in HTML
    li.innerHTML = message.replace(/\n/g, '<br>');
    document.getElementById('message-list').appendChild(li);
});



// Drag and Drop File Upload
const imageSection = document.getElementById("image-section");
const messageList = ul;  // Reuse the existing message list
const imageContainer = document.getElementById("image-container");

// Add placeholder text initially
const placeholderText = document.createElement("p");
placeholderText.className = "placeholder";
placeholderText.textContent = "Upload image here";
imageContainer.appendChild(placeholderText);

// Function to update placeholder text
function setPlaceholderText(text) {
    placeholderText.textContent = text;
}

// Handle drag over events
imageSection.addEventListener("dragover", (e) => {
    e.preventDefault();
    imageSection.classList.add("drag-over"); // Darken the image section
    setPlaceholderText("Drop your image here"); // Change text when hovering
});

// Handle drag leave events
imageSection.addEventListener("dragleave", (e) => {
    e.preventDefault();
    imageSection.classList.remove("drag-over"); // Remove darkened effect
    setPlaceholderText("Upload image here"); // Revert text when leaving
});

// Handle drop events
imageSection.addEventListener("drop", (e) => {
    e.preventDefault();
    imageSection.classList.remove("drag-over"); // Remove darkened effect
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

                // Clear the image container and remove placeholder text
                imageContainer.innerHTML = ''; // Clear previous content
                
                if (file.type.startsWith("image/")) {
                    const img = document.createElement("img");
                    img.src = data.url;
                    img.alt = file.name;
                    img.style.maxWidth = "100%";
                    img.style.maxHeight = "100%";
                    imageContainer.appendChild(img);
                    
                    const fileName = document.createElement("p");
                    fileName.className = "file-name";
                    fileName.textContent = file.name;
                    imageContainer.appendChild(fileName);
                } else if (file.type === "application/pdf") {
                    // Render PDF using PDF.js
                    renderPDF(data.url);
                } else {
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

// Function to render PDF using PDF.js
function renderPDF(url) {
    const canvas = document.createElement("canvas");
    imageContainer.innerHTML = ''; // Clear previous content
    imageContainer.appendChild(canvas);
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
        imageContainer.innerHTML = `<p>Failed to load PDF.</p>`;
    });
}
