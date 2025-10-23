
// Register WS connection

// Delete WS connection

import { fastifyWebsocket } from '@fastify/websocket';
import { FastifyInstance } from "fastify";

function handleWebSocketConnection(connection: any, request: any): void {
	const participantId = request.query.participant_id;
	const fastify = request.server;
	
	console.log("Handling WebSocket connection for participant:", participantId);

	if (!participantId) {
		console.log("Missing participant_id");
		connection.socket.close(4001, "Missing participant_id");
		return;
	}
	
	const isInQueue = fastify.matchmaking.isPlayerAlreadyInQueue(participantId);
	if (!isInQueue) {
		console.log(`Participant ${participantId} not in queue`);
		connection.socket.close(4002, "Not in queue");
		return;
	}
	
	fastify.matchmaking.saveWebSocket(participantId, connection);
	
	connection.socket.on("message", function(message: string) {
		try {
			const data = JSON.parse(message);
			if (data.type == "ping") {
				connection.socket.send(JSON.stringify({ type: "pong" }));
			}
		} catch (error) {
			console.log("Invalid message:", error);
		}
	});
	
	connection.socket.on("close", function() {
		fastify.matchmaking.removeWebSocket(participantId);
	});
	
	connection.socket.on("error", function() {
		fastify.matchmaking.removeWebSocket(participantId);
	});
}

export default function matchmakingRoutes(fastify: FastifyInstance, options: any, done: Function): void {
	fastify.get("/ws", { websocket: true }, handleWebSocketConnection);
	done();
}