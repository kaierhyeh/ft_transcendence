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
	id: number;
	username: string;
	avatar: string;
	win: number;
	loses: number;
	isBlockedByThis: boolean;
}


function setElementHidden(elementId: string, hidden: boolean): void {
	const element = document.getElementById(elementId);
	if (element) {
		if (hidden) {
			element.classList.add("hidden");
		} else {
			element.classList.remove("hidden");
		}
	}
}

function setElementHTML(elementId: string, html: string): void {
	const element = document.getElementById(elementId);
	if (element) {
		element.innerHTML = html;
	}
}

function addElementEventListener(elementId: string, eventType: string, handler: EventListener): void {
	const element = document.getElementById(elementId);
	if (element) {
		element.addEventListener(eventType, handler);
	}
}

function showListOfChats(): void {
	const chatList = document.getElementById("chat-users-list");
	if (!chatList) {
		return;
	}

}

// export function chatRun(): void {
// 	// We need this.user info
// 	// We need all users info
// 	const users = [];

// 	const chatBtn = document.getElementById("chatBtn");
// 	const closeChatBtn = document.getElementById("closeChatBtn");

// 	if (!chatBtn || !closeChatBtn) {
// 		console.error("Cannot initialize chat: chat buttons not found");
// 		return;
// 	}

// 	chatBtn.addEventListener("click", () => setElementHidden("chatWindow", false));
// 	closeChatBtn.addEventListener("click", () => setElementHidden("chatWindow", true));

// 	//get chats
// 	showListOfChats();

// 	//set event to each chat line

// }


export async function initChat(currentUserId: number): Promise<void> {
	console.log("Chat initialized");
	const API_CHAT_ENDPOINT = `${window.location.origin}/api/chat`;

	const chatBtn = document.getElementById("chatBtn");
	const closeChatBtn = document.getElementById("closeChatBtn");
	const backChatBtn = document.getElementById("backChatBtn");
	const chatWindow = document.getElementById("chatWindow");
	const chatUsersList = document.getElementById("chat-users-list")!;
	const chatMessages = document.getElementById("chatMessages")!;
	const chatBlock = document.getElementById("chatBlock")!;


	if (!chatBtn || !closeChatBtn || !chatWindow || !chatUsersList || !chatMessages || !chatBlock) {
		console.error("Cannot initialize chat: some elements not found");
		return;
	}

	chatBtn.addEventListener("click", () => {
		chatWindow.classList.remove("hidden");
		chatBtn.classList.add("hidden");
	});
	closeChatBtn.addEventListener("click", () => {
		chatWindow.classList.add("hidden");
		chatBtn.classList.remove("hidden");
	});
	backChatBtn?.addEventListener("click", () => {
		chatMessages.classList.add("hidden");
		chatBlock.classList.add("hidden");
		chatUsersList.classList.remove("hidden");
		backChatBtn.classList.add("hidden");
	});

	// List of users to chat with (id, username, avatar, win, loses, isBlockedByThis)
	async function loadChats(): Promise<void> {
		try {
			console.log("CHAT: loadChats");
			const res = await fetch(`${API_CHAT_ENDPOINT}/chats/${currentUserId}`);
			if (!res.ok) throw new Error("Failed to load chats");
			const users: ChatUser[] = await res.json();
			renderChatList(users);
		} catch (err) {
			console.error("Error loading chats:", err);
		}
	}

	function renderChatList(users: ChatUser[]): void {
		console.log("CHAT: renderChatList");
		chatUsersList.innerHTML = users.map(user => `
			<div class="chatConv" data-user-id="${user.id}">
				<img src="${user.avatar}" class="chat-avatar" />
				<span>${user.username} (${user.win}W / ${user.loses}L)</span>
			</div>
		`).join("");

		document.querySelectorAll(".chatConv").forEach(conv => {
			conv.addEventListener("click", () => {
				const userId = (conv as HTMLElement).dataset.userId;
				if (userId) openChatWindow(parseInt(userId));
			});
		});
	}

	async function openChatWindow(withUserId: number): Promise<void> {
		try {
			console.log("CHAT: openChatWindow");
			const res = await fetch(`${API_CHAT_ENDPOINT}/messages/${withUserId}`);
			if (!res.ok) throw new Error("Failed to load messages");
			const messages: Message[] = await res.json();
			renderMessages(messages, withUserId);
		} catch (err) {
			console.error("Error loading messages:", err);
		}
	}

	function renderMessages(messages: Message[], withUserId: number): void {
		console.log("CHAT: renderMessages");

		chatUsersList.classList.add("hidden");
		chatMessages.classList.remove("hidden");
		chatBlock.classList.remove("hidden");
		backChatBtn?.classList.remove("hidden");

		chatMessages.innerHTML = messages.map(msg => `
			<div class="chat-msg ${msg.fromId === currentUserId ? "from-me" : "from-them"}">
				${msg.msg}
			</div>
		`).join("");

		const sendBtn = document.getElementById("chatSendBtn");
		const input = document.getElementById("chatMessageToSend") as HTMLInputElement | null;

		if (sendBtn && input) {
			sendBtn.onclick = async () => {
				if (input.value.trim()) {
					await sendMessage(withUserId, input.value.trim());
					input.value = "";
					await openChatWindow(withUserId);
				}
			};
		}
	}

	async function sendMessage(toId: number, msg: string): Promise<void> {
		console.log("CHAT: sendMessage");
		const payload: NewMessageRequest = { fromId: currentUserId, toId, msg };

		try {
			const res = await fetch(`${API_CHAT_ENDPOINT}/messages`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			if (!res.ok) throw new Error("Failed to send message");
			const data: NewMessageResponse = await res.json();
			console.log("Message sent:", data);
		} catch (err) {
			console.error("Error sending message:", err);
		}
	}

	await loadChats();
}


	// fastify.post("/messages", postMessagesController);
	// fastify.get("/messages/:userId", getMessagesController);
	// fastify.delete("/messages/:id", deleteMessageController);
	// fastify.get("/chats/:userId", getChatPartnersController);
