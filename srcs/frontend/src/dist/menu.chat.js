import { clearEvents, hideElementById, setMenuTitle, showElementById } from "./menu.utils.js";
/* ============================================ GLOBALS ===================================== */
let API_CHAT_ENDPOINT;
let menuBackButton;
let usersSectionButton;
let chatsSection;
let chatsList;
let chatMessages;
let chatLowerPanel;
let chatInviteGameButton;
let chatInput;
let chatSendButton;
let thisUserId;
function initializeGlobals(userId) {
    API_CHAT_ENDPOINT = `${window.location.origin}/api/chat`;
    menuBackButton = document.getElementById("menuBackButton");
    usersSectionButton = document.getElementById("usersSectionButton");
    chatsSection = document.getElementById("chatsSection");
    chatsList = document.getElementById("chatsList");
    chatMessages = document.getElementById("chatMessages");
    chatLowerPanel = document.getElementById("chatLowerPanel");
    chatInviteGameButton = document.getElementById("chatInviteGameButton");
    chatInput = document.getElementById("chatMessageToSend");
    chatSendButton = document.getElementById("chatSendButton");
    thisUserId = userId;
    if (!API_CHAT_ENDPOINT || !menuBackButton || !usersSectionButton || !chatsSection || !chatsList
        || !chatMessages || !chatLowerPanel || !chatInviteGameButton || !chatInput || !chatSendButton) {
        return false;
    }
    return true;
}
/* ====================================== UTILS ============================================= */
function clearBeforeOpenChatsSection() {
    clearEvents("#chatsSection"); // chats, invite, send msg
    clearEvents("#menuBackButton"); // back button
    if (!initializeGlobals(thisUserId)) { // update references of global variables
        console.error("CHAT: globals reinitialization failed: Missing elements");
    }
}
function resetChatSection() {
    hideElementById("chatLowerPanel");
    hideElementById("chatMessages");
    hideElementById("menuBackButton");
    showElementById("usersSectionButton");
    showElementById("friendsSectionButton");
    showElementById("chatsSectionButton");
    setMenuTitle("chats");
}
/* =================================== CHATS SECTION ======================================== */
function renderChatList(users) {
    showElementById("chatsList");
    users.map(user => {
        console.log(`CHAT: user: ${user.userId} (${user.username}), chatId: ${user.chatId}, avatar: ${user.avatar}, W:${user.wins} L:${user.losses}`);
    });
    chatsList.innerHTML = users.map(user => `
		<div class="chat-with" data-chat-id="${user.chatId}" data-user-id="${user.userId}">
		<img class="chat-avatar" src="${user.avatar || '/images/image.png'}">
		<span>
		${user.username} ( <span class="green-text">${user.wins}:W</span> / <span class="red-text">${user.losses}:L</span> )
		</span>
		</div>
		`).join("");
    // Add click event listeners to each chat item
    document.querySelectorAll(".chat-with").forEach(conv => {
        conv.addEventListener("click", () => {
            const userId = conv.dataset.userId;
            const chatId = conv.dataset.chatId;
            console.log("CHAT: Clicked on chatId:", chatId, " userId:", userId);
            if (chatId && userId) {
                initMessageSection(parseInt(chatId), users.find(u => u.userId === parseInt(userId)));
            }
        });
    });
}
async function loadChats() {
    try {
        const res = await fetch(`${API_CHAT_ENDPOINT}/chats/${thisUserId}`);
        if (!res.ok) {
            throw new Error("Failed to load chats");
        }
        const users = await res.json();
        renderChatList(users);
    }
    catch (err) {
        console.error("Error loading chats:", err);
    }
}
async function initChatSection() {
    clearBeforeOpenChatsSection();
    resetChatSection();
    showElementById("chatsList");
    showElementById("chatsSection");
    setMenuTitle("chats");
    await loadChats();
}
/* =================================== MESSAGES SECTION ===================================== */
// Message section events
async function sendMessageByButton(toUser) {
    console.log("CHAT: Send button clicked");
    if (chatInput) {
        const message = chatInput.value.trim();
        if (message) {
            console.log("CHAT: Sending message:", message);
            sendMessage(toUser.userId, message);
        }
        chatInput.value = "";
    }
}
async function sentMessageByEnter(event) {
    if (event.key === "Enter") {
        console.log("CHAT: Enter pressed in input");
        event.preventDefault();
        chatSendButton.click();
    }
}
async function inviteToGame(toUser) {
    console.log(`CHAT: Invite pressed: invite [${toUser.username}] to a game (not implemented)`);
}
async function goBackToChatsList() {
    initChatSection();
}
// Message init functions
function renderMessages(messages, withUser) {
    console.log("CHAT: renderMessages");
    chatsList.classList.add("hidden");
    chatMessages.classList.remove("hidden");
    chatLowerPanel.classList.remove("hidden");
    menuBackButton?.classList.remove("hidden");
    // better to use this.user.username instead of "You: "
    chatMessages.innerHTML = messages.map(msg => `
		<div class="chat-msg ${msg.fromId === withUser.userId ? withUser.username : "from-them"}">
		${msg.fromId !== withUser.userId
        ? `<span class="green-text">You: </span>`
        : `<span class="blue-text">${withUser.username}: </span>`}
		${msg.msg}
		</div>`).join("");
    const sendBtn = document.getElementById("chatSendButton");
    const input = document.getElementById("chatMessageToSend");
    if (sendBtn && input) {
        sendBtn.onclick = async () => {
            if (input.value.trim()) {
                const newMsg = await sendMessage(withUser.userId, input.value.trim());
                input.value = "";
                if (newMsg) {
                    await initMessageSection(newMsg.chatId, withUser);
                }
            }
        };
    }
}
async function sendMessage(toId, msg) {
    console.log("CHAT: sendMessage");
    const payload = { fromId: thisUserId, toId, msg };
    try {
        const res = await fetch(`${API_CHAT_ENDPOINT}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            throw new Error("Failed to send message");
        }
        const data = await res.json();
        console.log("Message sent:", data);
        return data;
    }
    catch (err) {
        console.error("Error sending message:", err);
        throw err;
    }
}
async function initMessageSection(chatId, withUser) {
    try {
        console.log(`CHAT: initMessageSection {chatId: ${chatId}, withUser: ${withUser.username}}`);
        chatInput.value = "";
        // Sent message by using button
        chatSendButton.addEventListener("click", () => sendMessageByButton(withUser));
        chatInput.addEventListener("keydown", (event) => sentMessageByEnter(event));
        chatInviteGameButton.addEventListener("click", () => inviteToGame(withUser));
        menuBackButton.addEventListener("click", () => goBackToChatsList());
        // Manually set title with username (not using translation key)
        const menuTitleElement = document.getElementById("menuTitle");
        if (menuTitleElement) {
            menuTitleElement.textContent = `${withUser.username}`;
        }
        const res = await fetch(`${API_CHAT_ENDPOINT}/messages/${chatId}/${withUser.userId}`);
        if (!res.ok) {
            throw new Error("Failed to load messages");
        }
        const messages = await res.json();
        console.log("CHAT: Loaded messages:", messages);
        renderMessages(messages, withUser);
    }
    catch (err) {
        console.error("Error loading messages:", err);
    }
}
/* =============================== INITIALIZATION OF CHAT SECTION =========================== */
export async function openChatsSection(userId) {
    console.log("MENU: Chats Section opened");
    initializeGlobals(userId);
    if (!menuBackButton || !usersSectionButton || !chatsSection || !chatsList || !chatMessages
        || !chatLowerPanel || !chatInviteGameButton || !chatInput || !chatSendButton) {
        console.error("One or more required elements not found, cannot open Chats section");
        return;
    }
    // Clear events to prevent multiple bindings
    await initChatSection();
}
//# sourceMappingURL=menu.chat.js.map