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

// 	const menuButton = document.getElementById("menuButton");
// 	const menuCloseButton = document.getElementById("menuCloseButton");

// 	if (!menuButton || !menuCloseButton) {
// 		console.error("Cannot initialize chat: chat buttons not found");
// 		return;
// 	}

// 	menuButton.addEventListener("click", () => setElementHidden("menuWindow", false));
// 	menuCloseButton.addEventListener("click", () => setElementHidden("menuWindow", true));

// 	//get chats
// 	showListOfChats();

// 	//set event to each chat line

// }

// Event functions




export async function initChat(currentUserId: number): Promise<void> {
	console.log("Chat initialized");
	const API_CHAT_ENDPOINT = `${window.location.origin}/api/chat`;

	const menuButton = document.getElementById("menuButton");
	const menuCloseButton = document.getElementById("menuCloseButton");
	const menuBackButton = document.getElementById("menuBackButton");
	const menuWindow = document.getElementById("menuWindow");
	const chatUsersList = document.getElementById("chat-users-list")!;
	const chatMessages = document.getElementById("chatMessages")!;
	const chatLowerPanel = document.getElementById("chatLowerPanel")!;
	const chatInput = document.getElementById("chatMessageToSend") as HTMLInputElement;
	const chatSendBtn = document.getElementById("chatSendBtn")!;
	const chatInviteGameBtn = document.getElementById("chatInviteGameBtn")!;

	if (!menuButton || !menuCloseButton || !menuWindow || !chatUsersList
		|| !chatMessages || !chatLowerPanel || !chatInput || !chatSendBtn) {
		console.error("Cannot initialize chat: some elements not found");
		return;
	}

	menuButton.addEventListener("click", () => {
		menuWindow.classList.remove("hidden");
		menuButton.classList.add("hidden");
	});

	menuCloseButton.addEventListener("click", () => {
		menuWindow.classList.add("hidden");
		chatMessages.classList.add("hidden");
		changeHeaderText("Chats", null as any);
		menuButton.classList.remove("hidden");
	});

	// List of users to chat with (id, username, avatar, win, loses, isBlockedByThis)
	async function loadChats(): Promise<void> {
		try {
			console.log("CHAT: loadChats");
			const res = await fetch(`${API_CHAT_ENDPOINT}/chats/${currentUserId}`);
			if (!res.ok) {
				throw new Error("Failed to load chats");
			}
			const users: ChatUser[] = await res.json();
			renderChatList(users);
		} catch (err) {
			console.error("Error loading chats:", err);
		}
	}

	function changeHeaderText(headerText: string, withUser: ChatUser): void {
		const chatTitleElem = document.getElementById("menuTitle");
		if (!chatTitleElem) {
			return;
		}

		if (withUser) {
			const avatar = document.createElement("img");
			avatar.className = "chat-header-avatar";
			avatar.src = withUser.avatar || "/images/image.png"; // replace with default avatar if none

			const headerSpan = document.createElement("span");
			headerSpan.className = "chat-header-username";
			headerSpan.textContent = withUser.username;

			chatTitleElem.innerHTML = "";
			chatTitleElem.appendChild(avatar);
			chatTitleElem.appendChild(headerSpan);

			chatTitleElem.addEventListener("click", () => {
				console.log("CHAT: Clicked on chat header to open user info (not implemented)");
			});
		} else {
			chatTitleElem.textContent = headerText;
			chatTitleElem.onclick = null;
		}
	}

	// Render the list of users to chat with (if chat exist)
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
				if (chatId && userId) {
					openMenuWindow(parseInt(chatId), users.find(u => u.userId === parseInt(userId))!);
				}
			});
		});
	}

	// Open chat window with a specific user
	async function openMenuWindow(chatId: number, withUser: ChatUser): Promise<void> {
		try {
			console.log(`CHAT: openMenuWindow {chatId: ${chatId}, withUser: ${withUser.username}}`);
			chatInput.value = "";

			// Sent message by using button
			chatSendBtn.addEventListener("click", async () => {
				console.log("CHAT: Send button clicked");
				if (chatInput) {
					const message = chatInput.value.trim();
					if (message) {
						console.log("CHAT: Sending message: ", message);
						sendMessage(withUser.userId, message);
					}
					chatInput.value = "";
				}
			});

			// Sent message by pressing Enter
			chatInput.addEventListener("keydown", async (e) => {
				if (e.key === "Enter") {
					console.log("CHAT: Enter pressed in input");
					e.preventDefault();
					chatSendBtn.click();
				}
			});

			chatInviteGameBtn.addEventListener("click", () => {
				// Implement game invite logic here
				console.log(`Invite ${withUser.username} to a game (not implemented)`);
			});

			menuBackButton?.addEventListener("click", () => {
				chatInviteGameBtn.removeEventListener("click", () => {
					console.log(`Invite ${withUser.username} to a game (not implemented)`);
				});
				chatSendBtn.onclick = null;
				chatInput.onkeydown = null;
				chatMessages.classList.add("hidden");
				chatLowerPanel.classList.add("hidden");
				changeHeaderText("Chats", null as any);
				chatUsersList.classList.remove("hidden");
				menuBackButton.classList.add("hidden");
			});

			changeHeaderText(withUser.username, withUser);

			const res = await fetch(`${API_CHAT_ENDPOINT}/messages/${chatId}/${withUser.userId}`);
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

	// Render messages betwin this.user and withUser in the chat window
	function renderMessages(messages: Message[], withUser: ChatUser): void {
		console.log("CHAT: renderMessages");

		chatUsersList.classList.add("hidden");
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

		const sendBtn = document.getElementById("chatSendBtn");
		const input = document.getElementById("chatMessageToSend") as HTMLInputElement | null;

		if (sendBtn && input) {
			sendBtn.onclick = async () => {
				if (input.value.trim()) {
					const newMsg: NewMessageResponse = await sendMessage(withUser.userId, input.value.trim());
					input.value = "";
					if (newMsg) {
						await openMenuWindow(newMsg.chatId, withUser);
					}
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

	await loadChats();
}


	// fastify.post("/messages", postMessagesController);
	// fastify.get("/messages/:userId", getMessagesController);
	// fastify.delete("/messages/:id", deleteMessageController);
	// fastify.get("/chats/:userId", getChatPartnersController);
