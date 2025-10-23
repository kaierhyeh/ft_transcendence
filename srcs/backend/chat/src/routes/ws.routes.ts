import { FastifyInstance } from "fastify";

export const chatClientsWebSocket = new Map<number, WebSocket>();

function registerWebSocketConnection(connection: any, request: any): void {
	const clientId = request.query.client_id;
	
	console.log("Handling WebSocket connection for participant:", clientId);

	if (!clientId) {
		console.log("Missing client_id");
		connection.socket.close(4001, "Missing client_id");
		return;
	}

	// save new connection or update old one 
	chatClientsWebSocket.set(Number(clientId), connection);
	
	connection.socket.on("message", function(message: string) {
		try {
			const data = JSON.parse(message);
			// check connection
			if (data.type == "ping") {
				connection.socket.send(JSON.stringify({ type: "pong" }));
			}
		} catch (error) {
			console.log("Invalid message:", error);
		}
	});
	
	// if connection closes - remove it from the map
	connection.socket.on("close", function() {
		chatClientsWebSocket.delete(Number(clientId));
	});
	
	// if error occurs - remove connection from the map
	connection.socket.on("error", function() {
		chatClientsWebSocket.delete(Number(clientId));
	});
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