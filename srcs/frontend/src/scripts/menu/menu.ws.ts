import user from "../user/User.js";
import { NewGame, NewMessage } from "./menu.types.js";
import { t } from "../i18n/i18n.js";

let chatSocket: WebSocket | null = null;
let pingInterval: number | null = null;
let lastPongTime = 0;

function createGameLink(gameId: number): HTMLDivElement {
	const container = document.createElement('div');
	container.className = 'chat-msg-invite-to-game-link';
	
	const serverLabel = document.createElement('span');
	serverLabel.textContent = ' Server: ';
	
	const link = document.createElement('a');
	link.dataset.route = `/arena?game_id=${gameId}`;
	link.className = 'auth-link';
	link.dataset.i18n = 'startGameLink';
	link.textContent = t("startGameLink");
	
	link.addEventListener('click', (e) => {
		e.preventDefault();
		const path = link.dataset.route;
		if (path && (window as any).navigateTo) {
			(window as any).navigateTo(path);
		}
	});
	
	container.appendChild(serverLabel);
	container.appendChild(link);
	
	return container;
}

function cleanupAndReconnect() {
	if (pingInterval) {
		clearInterval(pingInterval);
		pingInterval = null;
	}
	if (chatSocket) {
		try { chatSocket.close(1000, "Reconnecting..."); } catch {}
		chatSocket = null;
	}
	setTimeout(wsConnectChat, 2000);
}

export function wsConnectChat() {
	console.log("Connecting to WebSocket [ Client <-> Chat-Service ]...");

	const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	console.log("Using protocol:", protocol);

	if (chatSocket === null) {
		chatSocket = new WebSocket(`${protocol}//${window.location.host}/api/chat_ws?client_id=${user.user_id}`);
	}
	console.log("WebSocket instance created [ Client <-> Chat-Service ]");

	chatSocket.onopen = () => {
		console.log("WebSocket connection established [ Client <-> Chat-Service ]");

		lastPongTime = Date.now();
		pingInterval = window.setInterval(() => {
			if (chatSocket?.readyState === WebSocket.OPEN) {
				console.log("Sending ping...");
				chatSocket.send(JSON.stringify({ type: "ping" }));
			}

			if (Date.now() - lastPongTime > 70000) {
				console.warn("No pong received — reconnecting...");
				cleanupAndReconnect();
			}
		}, 30000);
	};

	chatSocket.onmessage = (event) => {
		console.log("WebSocket message received [ Client <-> Chat-Service ]:", event.data);

		try {
			const data = JSON.parse(event.data);
			switch (data.type) {
				case 'chat_message':
					try {
						console.log("WS Received 'chat_message' [ Client <-- Chat-Service ]: ", data);
						const newMessage = data.newMessage as NewMessage;
						const chatMessages = document.querySelector(`#chatMessages[data-chat-id="${newMessage.chat_id}"]`);

						if (!chatMessages) { 
							lastPongTime = Date.now();
							break; 
						}

						console.log("WS Appending new message to chatMessages:", newMessage);
						const child = `
							<div class="chat-msg chat_id=${newMessage.chat_id} ${newMessage.username}">
									<span class="blue-text">${newMessage.username}: </span>
								${newMessage.msg}
							</div>
						`;

						console.log("WS Inserting new child into chatMessages:", child);
						chatMessages.insertAdjacentHTML('beforeend', child);
						chatMessages.scrollTop = chatMessages.scrollHeight;
						console.log("WS Inserting new child into chatMessages: FINISHED");

					} catch (err) {}
					lastPongTime = Date.now();
					break;

				case 'pong':
					console.log("WS Received 'pong' [ Client <-- Chat-Service ]: ", data);
					lastPongTime = Date.now();
					break;

				case 'game_created':
					try {
						console.log("WS Received 'game_created' [ Client <-- Chat-Service ]: ", data);
						const newGame = data.newGame as NewGame;
						const chatMessages = document.querySelector(`#chatMessages[data-chat-id="${newGame.chat_id}"]`);

						if (!chatMessages) { 
							lastPongTime = Date.now();
							break; 
						}
						
						console.log("WS Appending game invite to chatMessages:", newGame);
						const gameLink = createGameLink(newGame.game_id);
						
						console.log("WS Inserting game invite into chatMessages");
						chatMessages.appendChild(gameLink);
						chatMessages.scrollTop = chatMessages.scrollHeight;
						console.log("WS Inserting game invite into chatMessages: FINISHED");

					} catch (err) {}
					lastPongTime = Date.now();
					break;

				case 'invite_failed':
					try {
						console.log("WS Received 'invite_failed' [ Client <-- Chat-Service ]: ", data);
						const newGame = data.newGame as NewGame;
						const chatMessages = document.querySelector(`#chatMessages[data-chat-id="${newGame.chat_id}"]`);

						if (!chatMessages) { 
							lastPongTime = Date.now();
							break; 
						}
						
						console.log("WS Appending invite failed message to chatMessages:", newGame);
						const child = `
							<div class="chat-msg-invite-to-game-failed">
								<span class="yellow-text"> Server: </span>
								<span>Game invite failed. The user may be not in the chat.</span>
							</div>
						`;
						console.log("WS Inserting invite failed message into chatMessages:", child);
						chatMessages.insertAdjacentHTML('beforeend', child);
						chatMessages.scrollTop = chatMessages.scrollHeight;
						console.log("WS Inserting invite failed message into chatMessages: FINISHED");

					} catch (err) {}
					lastPongTime = Date.now();
					break;

				default:
					console.log("WS Received 'unknown_type' [ Client <-- Chat-Service ]: ", data);
			}


		} catch (error) {
			console.error("Error parsing WebSocket message [ Client <-> Chat-Service ]:", error);
		}

	};

	chatSocket.onclose = (event) => {
		console.log("WebSocket connection closed [ Client <-> Chat-Service ]:", event);
		chatSocket?.close(event.code, event.reason);
		chatSocket = null;
	};

	chatSocket.onerror = (error) => {
		console.error("WebSocket connection error [ Client <-> Chat-Service ]:", error);
		chatSocket = null;
	};
}

export { chatSocket };