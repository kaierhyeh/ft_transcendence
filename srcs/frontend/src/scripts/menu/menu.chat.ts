import { clearEvents, hideElementById, setMenuTitle, showElementById } from "./menu.utils.js";
// import { i18n } from '../i18n/i18n.js';
import { openUsersSection } from "./menu.users.js";
import { ChatUser, Message, NewMessageRequest } from "./menu.types.js";

/* ============================================ GLOBALS ===================================== */

let API_CHAT_ENDPOINT: string;
let API_MSG_ENDPOINT: string;
let menuBackButton: HTMLElement;
let usersSectionButton: HTMLElement;
let chatsList: HTMLElement;
let chatMessages: HTMLElement;
let chatLowerPanel: HTMLElement;
let chatInviteGameButton: HTMLElement;
let chatInput: HTMLInputElement;
let chatSendButton: HTMLElement;

function initializeGlobals(): boolean {
	API_CHAT_ENDPOINT = `${window.location.origin}/api/chat`;
	API_MSG_ENDPOINT = `${window.location.origin}/api/message`;
	menuBackButton = document.getElementById("menuBackButton")!;
	usersSectionButton = document.getElementById("usersSectionButton")!;
	chatsList = document.getElementById("chatsList")!;
	chatMessages = document.getElementById("chatMessages")!;
	chatLowerPanel = document.getElementById("chatLowerPanel")!;
	chatInviteGameButton = document.getElementById("chatInviteGameButton")!;
	chatInput = document.getElementById("chatMessageToSend") as HTMLInputElement;
	chatSendButton = document.getElementById("chatSendButton")!;

	if (!API_CHAT_ENDPOINT || !menuBackButton || !usersSectionButton || !chatsList
		|| !chatMessages || !chatLowerPanel || !chatInviteGameButton || !chatInput || !chatSendButton) {
		return false;
	}
	return true;
}

/* ====================================== UTILS ============================================= */

function clearBeforeOpenChatsSection(): void {
	[	"#chatsList",
		"#chatMessages",
		"#chatLowerPanel",
		"#menuBackButton"
	].forEach(clearEvents);

	if (!initializeGlobals()) {
		console.error("CHAT: globals reinitialization failed: Missing elements");
	}
}

function clearBeforeInitMessageSection(): void {
	[	"#chatSendButton",
		"#chatMessageToSend",
		"#chatInviteGameButton",
		"#menuBackButton"
	].forEach(clearEvents);

	chatInviteGameButton = document.getElementById("chatInviteGameButton")!;
	chatInput = document.getElementById("chatMessageToSend") as HTMLInputElement;
	chatSendButton = document.getElementById("chatSendButton")!;
	menuBackButton = document.getElementById("menuBackButton")!;
}

function resetChatSection(): void {
	[	"chatLowerPanel",
		"chatMessages",
		"menuBackButton",
		"menuDropdown"
	].forEach(hideElementById);

	[	"menuControlPanel",
		"usersSectionButton",
		"chatsSectionButton"
	].forEach(showElementById);

	setMenuTitle("chats");
}

/* =================================== CHATS SECTION ======================================== */

function renderChatList(users: ChatUser[]): void {
	["chatsList"].forEach(showElementById);

	if (users.length === 0) {
		chatsList.innerHTML = `<h1 id="noChats" class="menu-empty-list-text" data-i18n="noChats">No chats</h1>`;
		return;
	}

	// users.map(u => {
	// 	console.log(`CHAT[${u.chat_id}]: user[${u.user_id}]([${u.username}]/[${u.alias}]) user_status[${u.user_status}] friendship[${u.friendship_status}] from[${u.from}]`);
	// });

	chatsList.innerHTML = users.map(u => {
		const avatarSrc = `${window.location.origin}/api/users/${u.user_id}/avatar`;

		const userName = u.alias
			? `${u.username} aka ${u.alias}`
			: u.username;

		const userStatus = u.user_status || "unknown";
		const statusHtml = u.friendship_status === "accepted"
			? `<span class="user-status-${userStatus.toLowerCase()}">${userStatus}</span>`
			: `<span class="user-status-unknown"></span>`;

		return `
		<div class="menu-list-element " data-chat-id="${u.chat_id}" data-user-id="${u.user_id}" data-friendship-status="${u.friendship_status}">
			<img class="chat-avatar" src="${avatarSrc}">
			<div class="chat-list-element-info">
				<span>${userName}</span>
				${statusHtml}
			</div>
		</div>
		`;
	}).join("");

	// Add click event listeners to each chat item
	document.querySelectorAll(".menu-list-element ").forEach(conv => {
		conv.addEventListener("click", () => {
			const userId = (conv as HTMLElement).dataset.userId;
			const chatId = (conv as HTMLElement).dataset.chatId;
			const friendshipStatus = (conv as HTMLElement).dataset.friendshipStatus;

			if (chatId && userId) {
				initMessageSection(parseInt(chatId), users.find(u => u.user_id === parseInt(userId))!, friendshipStatus!, 'chats');
			}
		});
	});

}

async function loadChats(): Promise<void> {
	try {
		const res = await fetch(`${API_CHAT_ENDPOINT}/`, {
			method: "GET",
			headers: {
				credentials: "include"
			}
		});
		if (!res.ok) {
			throw new Error("Failed to load chats");
		}
		const users: ChatUser[] = await res.json();
		renderChatList(users);
	} catch (err) {
		console.error("Error loading chats:", err);
	}
}

async function initChatSection(): Promise<void> {
	clearBeforeOpenChatsSection();
	resetChatSection();
	["chatsList"].forEach(showElementById);
	const userBtn = document.getElementById("usersSectionButton");
	if (userBtn)
		userBtn.className = "menu-control-panel-button";
	const chatsBtn = document.getElementById("chatsSectionButton");
	if (chatsBtn)
		chatsBtn.className = "menu-control-panel-button-pressed";
	await loadChats();
}

/* =================================== MESSAGES SECTION ===================================== */

// Message section events

function appendMessageToChat(msg: string): void {
	const msgElement = document.createElement("div");
	msgElement.className = "chat-msg from-them";
	msgElement.innerHTML = `<span class="green-text">You: </span>${msg}`;
	chatMessages.appendChild(msgElement);
	chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessageByButton(toUser: ChatUser): Promise<void> {
	if (chatInput) {
		const message = chatInput.value.trim();
		chatInput.value = "";
		if (message) {
			await sendMessage(toUser, message);
			appendMessageToChat(message);
		}
	}
}

async function sentMessageByEnter(event: KeyboardEvent): Promise<void> {
	if (event.key === "Enter") {
		event.preventDefault();
		chatSendButton.click();
	}
}

async function inviteToGame(toUser: ChatUser): Promise<void> {
	console.log(`CHAT: Invite pressed: invite [${toUser.username}] to a game (not implemented)`);
}

async function goBackToChatsList(): Promise<void> {
	chatMessages.innerHTML = ``;
	initChatSection();
}

async function goBackToUserList() {
	chatMessages.innerHTML = ``;
	openUsersSection();
}

// render and send msgs

function renderMessages(messages: Message[], withUser: ChatUser, friendshipStatus: string | null): void {

	[	"chatsList",
		"menuControlPanel"
	].forEach(hideElementById);

	if (friendshipStatus !== "blocked") {

		["unblockUserButtonInChat"].forEach(hideElementById);

		[	"chatLowerPanel",
			"chatInviteGameButton",
			"blockUserButtonInChat",
			"chatMessageBox"
		].forEach(showElementById);

	} else {

		[	"chatInviteGameButton",
			"blockUserButtonInChat",
			"chatMessageBox"
		].forEach(hideElementById);

		[	"chatLowerPanel",
			"unblockUserButtonInChat"
		].forEach(showElementById);

	}

	[	"chatMessages",
		"menuBackButton"
	].forEach(showElementById);

	chatMessages.innerHTML = messages.map(msg => `
		<div class="chat-msg ${msg.from_id === withUser.user_id ? withUser.username : "from-them"}">
		${msg.from_id !== withUser.user_id
			? `<span class="green-text">You: </span>`
			: `<span class="blue-text">${withUser.username}: </span>`}
			${msg.msg}
			</div>`).join("");

	chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage(toUser: ChatUser, msg: string) {

	const chatId = toUser.chat_id;
	const toId = toUser.user_id;
	const payload: NewMessageRequest = { chatId, toId, msg };

	try {
		const res = await fetch(`${API_MSG_ENDPOINT}/`, {
			method: "POST",
			headers: {
				credentials: 'include',
				"Content-Type": "application/json"
			},
			body: JSON.stringify(payload)
		});
		if (!res.ok) {
			throw new Error("Failed to send message");
		}
	} catch (err) {
		throw err;
	}

}

export async function initMessageSection(chatId: number, withUser: ChatUser, friendshipStatus: string | null, backTo: string): Promise<void> {
	try {
		initializeGlobals();
		chatInput.value = "";
		clearBeforeInitMessageSection();

		if (friendshipStatus !== "blocked") {
			// Sent message by using button
			chatSendButton.addEventListener("click", () => sendMessageByButton(withUser));
			chatInput.addEventListener("keydown", (event) => sentMessageByEnter(event));
			// Invite to game
			chatInviteGameButton.addEventListener("click", () => inviteToGame(withUser));
		}
		switch (backTo) {
			case 'users':
				menuBackButton.addEventListener("click", () => goBackToUserList());
				break;
			case 'chats':
				menuBackButton.addEventListener("click", () => goBackToChatsList());
				break;
		}

		setMenuTitle(`${withUser.username}`);

		const res = await fetch(`${API_CHAT_ENDPOINT}/${chatId}`, {
			method: "GET",
			headers: {
				credentials: "include"
			}
		});
		if (!res.ok) {
			throw new Error("Failed to load messages");
		}
		const messages: Message[] = await res.json();
		renderMessages(messages, withUser, friendshipStatus);
	} catch (err) {
		console.error("Error loading messages:", err);
	}
}

/* =============================== INITIALIZATION OF CHAT SECTION =========================== */

export async function openChatsSection(): Promise<void> {
	console.log("MENU: Chats Section opened");
	initializeGlobals();

	if (!menuBackButton || !usersSectionButton || !chatsList || !chatMessages
		|| !chatLowerPanel || !chatInviteGameButton || !chatInput || !chatSendButton) {
		console.error("One or more required elements not found, cannot open Chats section");
		return;
	}

	await initChatSection();
}
