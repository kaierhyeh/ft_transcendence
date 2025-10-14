import { clearEvents, hideElementById, setElementActive, setMenuTitle, showElementById } from "./menu.utils.js";
import { i18n } from '../i18n/i18n.js';

export interface Message {
	id: number;
	chatId: number;
	fromId: number;
	toId: number;
	msg: string;
}

export interface NewMessageRequest {
	fromId: number;
	toId: number;
	msg: string;
}

export interface NewMessageResponse {
	messageId: number;
	chatId: number;
	fromId: number;
	toId: number;
	msg: string;
}

export interface ChatUser {
	chat_id: number;
	user_id: number;
	username: string;
	alias: string | null;
	user_status: string;
	friendship_status: string | null;
}

/* ============================================ GLOBALS ===================================== */

let API_CHAT_ENDPOINT: string;
let menuBackButton: HTMLElement;
let usersSectionButton: HTMLElement;
let chatsSection: HTMLElement;
let chatsList: HTMLElement;
let chatMessages: HTMLElement;
let chatLowerPanel: HTMLElement;
let chatInviteGameButton: HTMLElement;
let chatInput: HTMLInputElement;
let chatSendButton: HTMLElement;
let thisUserId: number;

function initializeGlobals(userId: number): boolean {
	API_CHAT_ENDPOINT = `${window.location.origin}/api/chat`;
	menuBackButton = document.getElementById("menuBackButton")!;
	usersSectionButton = document.getElementById("usersSectionButton")!;
	chatsSection = document.getElementById("chatsSection")!;
	chatsList = document.getElementById("chatsList")!;
	chatMessages = document.getElementById("chatMessages")!;
	chatLowerPanel = document.getElementById("chatLowerPanel")!;
	chatInviteGameButton = document.getElementById("chatInviteGameButton")!;
	chatInput = document.getElementById("chatMessageToSend") as HTMLInputElement;
	chatSendButton = document.getElementById("chatSendButton")!;
	thisUserId = userId;

	if (!API_CHAT_ENDPOINT || !menuBackButton || !usersSectionButton || !chatsSection || !chatsList
		|| !chatMessages || !chatLowerPanel || !chatInviteGameButton || !chatInput || !chatSendButton) {
		return false;
	}
	return true;
}

/* ====================================== UTILS ============================================= */

function clearBeforeOpenChatsSection(): void {
	clearEvents("#chatsSection");				// chats, invite, send msg
	clearEvents("#menuBackButton");				// back button
	if (!initializeGlobals(thisUserId)) {		// update references of global variables
		console.error("CHAT: globals reinitialization failed: Missing elements");
	}
}

function resetChatSection(): void {
	hideElementById("chatLowerPanel");
	hideElementById("chatMessages");
	hideElementById("menuBackButton");
	hideElementById("menuDropdown");
	showElementById("usersSectionButton");
	showElementById("chatsSectionButton");
	setMenuTitle("chats");
}

/* =================================== CHATS SECTION ======================================== */

function renderChatList(users: ChatUser[]): void {

	showElementById("chatsList");

	users.map(u => {
		console.log(`CHAT: user: ${u.user_id} (${u.username}), chatId: ${u.chat_id}, W:? L:?`);
	});

	chatsList.innerHTML = users.map(u => {
		const avatarSrc = `https://localhost:4443/api/users/${u.user_id}/avatar`;

		const userName = u.alias
			? `${u.username} aka ${u.alias}`
			: u.username;

		const statusHtml = u.friendship_status
			? `<span class="user-status-${u.user_status.toLowerCase()}">${u.user_status}</span>`
			: `<span class="user-status-unknown"></span>`;

		return `
		<div class="chat-list-element" data-chat-id="${u.chat_id}" data-user-id="${u.user_id}">
			<img class="chat-avatar" src="${avatarSrc}">
			<div class="chat-list-element-info">
				<span>${userName}</span>
				${statusHtml}
			</div>
		</div>
		`;
	}).join("");

	// Add click event listeners to each chat item
	document.querySelectorAll(".chat-list-element").forEach(conv => {
		conv.addEventListener("click", () => {
			const userId = (conv as HTMLElement).dataset.userId;
			const chatId = (conv as HTMLElement).dataset.chatId;
			console.log("CHAT: Clicked on chatId:", chatId, " userId:", userId);
			if (chatId && userId) {
				initMessageSection(parseInt(chatId), users.find(u => u.user_id === parseInt(userId))!);
			}
		});
	});

}

async function loadChats(): Promise<void> {
	try {
		const res = await fetch(`${API_CHAT_ENDPOINT}/chats/${thisUserId}`);
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
	showElementById("chatsList");
	showElementById("chatsSection");
	await loadChats();
}

/* =================================== MESSAGES SECTION ===================================== */

// Message section events

async function sendMessageByButton(toUser: ChatUser): Promise<void> {
	console.log("CHAT: Send button clicked");
	if (chatInput) {
		const message = chatInput.value.trim();
		if (message) {
			console.log("CHAT: Sending message:", message);
			sendMessage(toUser.user_id, message);
		}
		chatInput.value = "";
	}
}	

async function sentMessageByEnter(event: KeyboardEvent): Promise<void> {
	if (event.key === "Enter") {
		console.log("CHAT: Enter pressed in input");
		event.preventDefault();
		chatSendButton.click();
	}
}

async function inviteToGame(toUser: ChatUser): Promise<void> {
	console.log(`CHAT: Invite pressed: invite [${toUser.username}] to a game (not implemented)`);
}

async function goBackToChatsList(): Promise<void> {
	initChatSection();
}

// Message init functions

function renderMessages(messages: Message[], withUser: ChatUser): void {
	console.log("CHAT: renderMessages");

	chatsList.classList.add("hidden");
	chatMessages.classList.remove("hidden");
	chatLowerPanel.classList.remove("hidden");
	menuBackButton?.classList.remove("hidden");

	// better to use this.user.username instead of "You: "
	chatMessages.innerHTML = messages.map(msg => `
		<div class="chat-msg ${msg.fromId === withUser.user_id ? withUser.username : "from-them"}">
		${msg.fromId !== withUser.user_id
			? `<span class="green-text">You: </span>`
			: `<span class="blue-text">${withUser.username}: </span>`}
		${msg.msg}
		</div>`).join("");

	const sendBtn = document.getElementById("chatSendButton");
	const input = document.getElementById("chatMessageToSend") as HTMLInputElement | null;

	if (sendBtn && input) {
		sendBtn.onclick = async () => {
			if (input.value.trim()) {
				const newMsg: NewMessageResponse = await sendMessage(withUser.user_id, input.value.trim());
				input.value = "";
				if (newMsg) {
					await initMessageSection(newMsg.chatId, withUser);
				}
			}
		};
	}
}

async function sendMessage(toId: number, msg: string): Promise<NewMessageResponse> {
	console.log("CHAT: sendMessage");
	const payload: NewMessageRequest = { fromId: thisUserId, toId, msg };

	try {
		const res = await fetch(`${API_CHAT_ENDPOINT}/messages`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		if (!res.ok) {
			throw new Error("Failed to send message");
		}
		const data: NewMessageResponse = await res.json();
		console.log("Message sent:", data);
		return data;
	} catch (err) {
		console.error("Error sending message:", err);
		throw err;
	}
}

async function initMessageSection(chatId: number, withUser: ChatUser): Promise<void> {
	try {
		console.log(`CHAT: initMessageSection {chatId: ${chatId}, withUser: ${withUser.username}}`);
		chatInput.value = "";

		// Sent message by using button
		chatSendButton.addEventListener("click", () => sendMessageByButton(withUser));
		chatInput.addEventListener("keydown", (event) => sentMessageByEnter(event));
		chatInviteGameButton.addEventListener("click", () => inviteToGame(withUser));
		menuBackButton.addEventListener("click", () => goBackToChatsList());

		setMenuTitle(`${withUser.username}`);

		const res = await fetch(`${API_CHAT_ENDPOINT}/messages/${chatId}/${withUser.user_id}`);
		if (!res.ok) {
			throw new Error("Failed to load messages");
		}
		const messages: Message[] = await res.json();
		console.log("CHAT: Loaded messages:", messages);
		renderMessages(messages, withUser);
	} catch (err) {
		console.error("Error loading messages:", err);
	}
}

/* =============================== INITIALIZATION OF CHAT SECTION =========================== */

export async function openChatsSection(userId: number): Promise<void> {
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
