import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { NewGame, NewMessage } from "../types/messages.type";

export const chatClientsWebSocket = new Map<number, WebSocket>();

function registerWebSocketConnection(socket: WebSocket, request: any): void {
	// const params = new URL(request.url, `https://${request.headers.host}`).searchParams;
	const clientId = new URLSearchParams(request.url.split('?')[1] || '').get('client_id')

	console.log("ROUTES WS register id=", clientId);

	if (!clientId) {
		// console.log("Missing client_id");
		socket.close(4001, "Missing client_id");
		chatClientsWebSocket.delete(Number(clientId));
		return;
	}

	// save new connection or update old one 
	chatClientsWebSocket.set(Number(clientId), socket);

	socket.on("message", (msg: string) => {
		try {
			console.log("WS on.message");
			const data = JSON.parse(msg.toString());
			if (data.type == "ping") {
				socket.send(JSON.stringify({ type: "pong" }));
			}
		} catch (error) {
			console.log("Invalid PING message:", error);

		}
	});
	
	// if connection closes - remove it from the map
	socket.on("close", () => {
		console.log("WS on.close");
		socket?.close();
		chatClientsWebSocket.delete(Number(clientId));
		console.log("ROUTES WS disconnected id=", clientId);
	});
	
	// if error occurs - remove connection from the map
	socket.on("error", () => {
		console.log("WS on.error");
		socket?.close();
		chatClientsWebSocket.delete(Number(clientId));
		console.error("ROUTES WS error for client id=", clientId);
	});
}

export function sendMessageToClientWebSocket(toId: number, content: NewMessage | NewGame, type: "chat_message" | "game_created" | "invite_failed"): boolean {
	const clientSocket = chatClientsWebSocket.get(toId);
	console.log("WS send msg toId=", toId, " socket=", clientSocket !== undefined ? "FOUND" : "NOT FOUND");

	if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
		console.log("WS send msg type=", type);

		switch (type) {

			case "chat_message":
				console.log("WS send msg newMessage=", content);
				clientSocket.send(JSON.stringify({ type: "chat_message", newMessage: content }));
				console.log("WS send msg: DONE");
				return true;

			case "game_created":
				console.log("WS send msg newGame=", content);	
				clientSocket.send(JSON.stringify({ type: "game_created", newGame: content }));
				console.log("WS send msg: DONE");
				return true;

			case "invite_failed":
				console.log("WS send msg inviteFailed=", content);
				clientSocket.send(JSON.stringify({ type: "invite_failed", newGame: content }));
				console.log("WS send msg: DONE");
				return true;

			default:
				console.log("WS send msg type=UNKNOWN");
				return false;
		}

	}
	console.log("WS send msg: FAILED");
	// clientSocket?.close();
	// chatClientsWebSocket.delete(toId);
	return false;
}

export default function wsRoutes(fastify: FastifyInstance, options: any, done: Function): void {

	fastify.get(
		"/",
		{
			websocket: true
		},
		registerWebSocketConnection
	);

	done();
}