
const chatBox = document.getElementById("chatBox");
const welcome = document.getElementById("welcome");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const clearChatButton = document.getElementById("clearChat");
const newChatButton = document.getElementById("newChat");

let isLoading = false;
let previousInteractionId = null;

// Add message to chat
function addMessage(text, sender) {

    if (welcome) {
        welcome.style.display = "none";
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = sender === "user" ? "👤" : "✨";

    const messageText = document.createElement("div");
    messageText.className = "message-text";
    messageText.textContent = text;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageText);

    chatBox.appendChild(messageDiv);

    chatBox.scrollTop = chatBox.scrollHeight;

    return messageText;
}

// Send message to backend
async function sendMessage() {

    const message = messageInput.value.trim();

    if (!message || isLoading) {
        return;
    }

    addMessage(message, "user");

    messageInput.value = "";
    messageInput.style.height = "auto";

    isLoading = true;
    sendButton.disabled = true;

    const aiMessage = addMessage("Thinking...", "ai");

    try {

        const response = await fetch("/api/chat", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: message,
                previousInteractionId: previousInteractionId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Request failed.");
        }

        if (!data.reply) {
            throw new Error("Gemini returned an empty response.");
        }

        aiMessage.textContent = data.reply;

        // Save conversation ID
        previousInteractionId = data.interactionId;

    } catch (error) {

        aiMessage.textContent = "Error: " + error.message;
        aiMessage.classList.add("error");

        console.error(error);

    } finally {

        isLoading = false;
        sendButton.disabled = false;

        messageInput.focus();

        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

// Send button
sendButton.addEventListener("click", sendMessage);

// Enter key
messageInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }

});

// Clear chat
function clearChat() {

    if (isLoading) return;

    chatHistoryReset();

    chatBox.querySelectorAll(".message").forEach(message => {
        message.remove();
    });

    if (welcome) {
        welcome.style.display = "";
    }
}

// Reset conversation
function chatHistoryReset() {
    previousInteractionId = null;
}

// Clear button
if (clearChatButton) {
    clearChatButton.addEventListener("click", clearChat);
}

// New chat button
if (newChatButton) {
    newChatButton.addEventListener("click", clearChat);
}

// Suggestion buttons
document.querySelectorAll(".suggestions button").forEach(button => {

    button.addEventListener("click", () => {

        if (isLoading) return;

        messageInput.value = button.textContent.trim();

        sendMessage();
    });

});

// Auto resize textarea
messageInput.addEventListener("input", () => {

    messageInput.style.height = "auto";

    messageInput.style.height =
        messageInput.scrollHeight + "px";

});

console.log("Gemini AI connected to backend!");
