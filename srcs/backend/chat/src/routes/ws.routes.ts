import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { NewMessage } from "../types/messages.type";

export const chatClientsWebSocket = new Map<number, WebSocket>();

function registerWebSocketConnection(socket: WebSocket, request: any): void {
	// const params = new URL(request.url, `https://${request.headers.host}`).searchParams;
	const clientId = new URLSearchParams(request.url.split('?')[1] || '').get('client_id')

	console.log("Handling WebSocket connection for participant:", clientId);

	if (!clientId) {
		console.log("Missing client_id");
		socket.close(4001, "Missing client_id");
		return;
	}

	// save new connection or update old one 
	chatClientsWebSocket.set(Number(clientId), socket);

	socket.on("message", (msg: string) => {
		try {
			const data = JSON.parse(msg.toString());
			if (data.type == "ping") {
				socket.send(JSON.stringify({ type: "pong" }));
			}
		} catch (error) {
			console.log("Invalid message:", error);
		}
	});
	
	// if connection closes - remove it from the map
	socket.on("close", () => {
		chatClientsWebSocket.delete(Number(clientId));
		console.log(`Client ${clientId} disconnected`);
	});
	
	// if error occurs - remove connection from the map
	socket.on("error", () => {
		chatClientsWebSocket.delete(Number(clientId));
		console.error(`WebSocket error for ${clientId}`);
	});
}

export function sendMessageToClientWebSocket(toId: number, newMessage: NewMessage): boolean {
	const clientSocket = chatClientsWebSocket.get(toId);
	console.log("----WS sendMessageToClientWebSocket toId:", toId, " socket:", clientSocket !== undefined ? "FOUND" : "NOT FOUND");
	if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
		console.log("----WS sendMessageToClientWebSocket: ", newMessage);
		clientSocket.send(JSON.stringify({ type: "chat_message", newMessage: newMessage }));
		console.log("----WS sendMessageToClientWebSocket: FINISHED");
		return true;
	}
	console.log("----WS sendMessageToClientWebSocket: FAILED");
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