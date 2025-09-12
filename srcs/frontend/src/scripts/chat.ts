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

export function initChat(): void {
	console.log("Chat initialized");

	const API_CHAT_ENDPOINT = `${window.location.origin}/api/chat`;

	async function run(): Promise<void>	{
		try {

			const response = await fetch(API_CHAT_ENDPOINT + `/${userId}/ws`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					fromId: 1,
					toId: 2,
					msg: "Hello from the frontend!"
				} as newMessageRequest) 
			});

			const data: newMessageResponse = await response.json();
			// handle data

		} catch (error) {
			console.error('Failed to run chat:', error);
		}
	}
	
	run();
}


	// fastify.post("/messages", postMessagesController);
	// fastify.get("/messages/:userId", getMessagesController);
	// fastify.delete("/messages/:id", deleteMessageController);
	// fastify.get("/chats/:userId", getChatPartnersController);