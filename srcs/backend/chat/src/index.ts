// init fastify, add plugins

import fastify, { FastifyInstance, FastifyRequest } from "fastify";
import fastifyJwt from "@fastify/jwt";
import FastifyWebsocket from "@fastify/websocket";

import { postMessageController } from "./controllers/messages.controller"
import { chatRoutes } from "./routes/chat.routes"
import { logError } from "./utils/errorHandler";
import { CONFIG } from "./config";

import "./db/database";
import { dataDTO, jwtDTO } from "./types/dto.type";

const chatServer: FastifyInstance = fastify({ logger: true });

chatServer.setErrorHandler((error, request, reply) => {
	logError(error, "Chat server");
	console.error("Handling error:", error);
	reply.status(error.statusCode || 500)
		.send({error: error.message || "Chat server error", statusCode: error.statusCode || 500});
})

chatServer.register(chatRoutes, { prefix: "/chat" });
chatServer.register(fastifyJwt, { secret: CONFIG.SECURITY.JWT_SECRET } );
chatServer.register(FastifyWebsocket);

// move to ws.routes
chatServer.register(async function (fastify:FastifyInstance) {
	fastify.get('/ws', {websocket:true}, async (inConnection:any, req:FastifyRequest<{Querystring:{token:string}}>) => {

		// is token okay
		const tok = req.query.token;
		if (!tok) {
			inConnection.socket.close(4001, "Token required");
			return;
		}
		try {
			chatServer.jwt.verify(tok) as jwtDTO;
		} catch (err) {
			inConnection.socket.close(4002, "Invalid token");
			return;
		}
		const jwtData = chatServer.jwt.verify(tok) as jwtDTO;
		const userId = jwtData.userId;
		if (!userId) {
			inConnection.socket.close(4003, "User ID missing in token");
			return;
		}

		// store connection
		clients.set(userId, inConnection);
		console.log("Connected via WebSocket userId=", userId);

		// handle input
		inConnection.on('message', async (msg:string) => {

			let data;
			try { data = JSON.parse(msg); } catch (e) { return; }
			
			if (data.type === "ping") {
				inConnection.send(JSON.stringify({type:"pong"}));
				return;
			}
			if (data.type === "chat_send_message") {
				await postMessageController(data.payload.fromId, data.payload.toId, data.payload.msg);
				const dataToSend: dataDTO = {
					type: "chat_incomming_message",
					payload: {
						fromId: data.payload.fromId,
						toId: data.payload.toId,
						msg: data.payload.msg,
					}
				}
				sendMessageViaWebSocket(data.payload.fromId, dataToSend);
				return;
			}

			console.log("No rules to handle type=", data.type)
			
		});

		// handle close connection
		inConnection.on('close', () => { clients.delete(userId); });

		// handle error connection
		inConnection.on('error', (e:any) => { clients.delete(userId); });

	})
});


// map of connected users (ID + WebSocket)
const clients = new Map<number, WebSocket>();

// function to sent message (after all manipulations with DB)
export function sendMessageViaWebSocket(toId:number, data:dataDTO) {

	const client = clients.get(toId);
	if (!client) { return; }

	try {
		client.send(JSON.stringify(data));
	} catch (e) {
		clients.delete(toId);
		console.error("Cant sent msg");
	}

}

const run = async () => {

	try {
		await chatServer.listen({port: CONFIG.SERVER.PORT, host: CONFIG.SERVER.HOST });
		console.log("Chat server was run sucsessfully");
	} catch (e) {
		logError(e, "Can not run chat server");
		console.error("Chat server error:", e);
		process.exit(1);
	}

}

run();
