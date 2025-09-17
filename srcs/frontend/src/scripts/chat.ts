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

/*
 * A user in a chat
 * @chatId - the ID of the chat
 * @userId - the ID of the user
 * @username - the username of the user
 * @avatar - the avatar URL of the user
 * @wins - number of wins
 * @losses - number of losses
 * @isBlockedByThis - whether this user is blocked by the current user
 */
export interface ChatUser {
	chatId: number;
	userId: number;
	username: string;
	avatar: string;
	wins: number;
	losses: number;
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
		users.map(user => {
			console.log(`User: ${user.userId} (${user.username}), chatId: ${user.chatId}, avatar: ${user.avatar}, W:${user.wins} L:${user.losses}`);
		});
		chatUsersList.innerHTML = users.map(user => `
			<div class="chat-with" data-chat-id="${user.chatId}" data-user-id="${user.userId}">
				<img class="chat-avatar" src="$${user.avatar || '/images/image.png'}">
					<span>
						${user.username} ( <span class="green-text">${user.wins}:W</span> / <span class="red-text">${user.losses}:L</span> )
					</span>
			</div>
		`).join("");

		document.querySelectorAll(".chat-with").forEach(conv => {
			conv.addEventListener("click", () => {
				const userId = (conv as HTMLElement).dataset.userId;
				const chatId = (conv as HTMLElement).dataset.chatId;
				console.log("CHAT: Clicked on chatId:", chatId, " userId:", userId);
				if (chatId && userId) openChatWindow(parseInt(chatId), users.find(u => u.userId === parseInt(userId))!);
			});
		});
	}

	async function openChatWindow(chatId: number, withUser: ChatUser): Promise<void> {
		try {
			console.log("CHAT: openChatWindow");
			const res = await fetch(`${API_CHAT_ENDPOINT}/messages/${chatId}/${withUser.userId}`);
			if (!res.ok) throw new Error("Failed to load messages");
			const messages: Message[] = await res.json();
			console.log("CHAT: Loaded messages:", messages);
			renderMessages(messages, withUser);
		} catch (err) {
			console.error("Error loading messages:", err);
		}
	}

	function renderMessages(messages: Message[], withUser: ChatUser): void {
		console.log("CHAT: renderMessages");

		chatUsersList.classList.add("hidden");
		chatMessages.classList.remove("hidden");
		chatBlock.classList.remove("hidden");
		backChatBtn?.classList.remove("hidden");

		const thisUser = "You: ";



		chatMessages.innerHTML = messages.map(msg => `
			<div class="chat-msg ${msg.fromId === withUser.userId ? withUser.username : "from-them"}">
				${msg.fromId !== withUser.userId
					? `<span class="green-text">You: </span>`
					: `<span class="blue-text">${withUser.username}: </span>`}
				${msg.msg}
			</div>
		`).join("");

		const sendBtn = document.getElementById("chatSendBtn");
		const input = document.getElementById("chatMessageToSend") as HTMLInputElement | null;

		if (sendBtn && input) {
			sendBtn.onclick = async () => {
				if (input.value.trim()) {
					const newMsg: NewMessageResponse = await sendMessage(withUser.userId, input.value.trim());
					input.value = "";
					if (newMsg) await openChatWindow(newMsg.chatId, withUser);
				}
			};
		}
	}

	async function sendMessage(toId: number, msg: string): Promise<NewMessageResponse> {
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
			return data;
		} catch (err) {
			console.error("Error sending message:", err);
			throw err;
		}
	}

	await loadChats();
}


	// fastify.post("/messages", postMessagesController);
	// fastify.get("/messages/:userId", getMessagesController);
	// fastify.delete("/messages/:id", deleteMessageController);
	// fastify.get("/chats/:userId", getChatPartnersController);
