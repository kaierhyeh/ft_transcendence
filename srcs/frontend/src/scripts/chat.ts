interface newMessageRequest {
	fromId: number;
	toId: number;
	msg: string;
}

interface newMessageResponse {
	messageId: number;
	chatId: number;
	fromId: number;
	toId: number;
	msg: string;
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

export function chatRun(): void {
	// We need this.user info
	// We need all users info
	const users = [];

	const chatBtn = document.getElementById("chatBtn");
	const closeChatBtn = document.getElementById("closeChatBtn");

	if (!chatBtn || !closeChatBtn) {
		console.error("Cannot initialize chat: chat buttons not found");
		return;
	}

	chatBtn.addEventListener("click", () => setElementHidden("chatWindow", false));
	closeChatBtn.addEventListener("click", () => setElementHidden("chatWindow", true));

	//get chats
	showListOfChats();

	//set event to each chat line

}






// export function initChat(): void {
// 	console.log("Chat initialized");
// 	const API_CHAT_ENDPOINT = `${window.location.origin}/api/chat`;
// 	async function run(): Promise<void>	{
// 		try {
// 			const response = await fetch(API_CHAT_ENDPOINT + "/${userId}/ws", {
// 				method: "POST",
// 				headers: {
// 					"Content-Type": "application/json",
// 				},
// 				body: JSON.stringify({
// 					fromId: 1,
// 					toId: 2,
// 					msg: "Hello from the frontend!"
// 				} as newMessageRequest) 
// 			});
// 			const data: newMessageResponse = await response.json();
// 			// handle data
// 		} catch (error) {
// 			console.error('Failed to run chat:', error);
// 		}
// 	}
// 	run();
// }


	// fastify.post("/messages", postMessagesController);
	// fastify.get("/messages/:userId", getMessagesController);
	// fastify.delete("/messages/:id", deleteMessageController);
	// fastify.get("/chats/:userId", getChatPartnersController);