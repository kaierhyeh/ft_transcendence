import fastify, { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import FastifyWebsocket from "@fastify/websocket";

import { chatRoutes } from "./routes/chat.routes";
import { wsRoutes } from "./routes/ws.routes";
import { logError } from "./utils/errorHandler";
import { CONFIG } from "./config";

import "./db/database";

const chatServer: FastifyInstance = fastify({ logger: true });

chatServer.setErrorHandler((error, request, reply) => {
	logError(error, "Chat server");
	console.error("Handling error:", error);
	reply
		.status(error.statusCode || 500)
		.send({
			error: error.message || "Chat server error",
			statusCode: error.statusCode || 500,
		});
});

chatServer.register(chatRoutes, { prefix: "/chat" });
chatServer.register(wsRoutes);
chatServer.register(fastifyJwt, { secret: CONFIG.SECURITY.JWT_SECRET });
chatServer.register(FastifyWebsocket);

const run = async () => {
	try {
		await chatServer.listen({ port: CONFIG.SERVER.PORT, host: CONFIG.SERVER.HOST });
		console.log("Chat server was run successfully");
	} catch (e) {
		logError(e, "Can not run chat server");
		console.error("Chat server error:", e);
		process.exit(1);
	}
};

run();
