import fastify, { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import FastifyWebsocket from "@fastify/websocket";

import { chatRoutes } from "./routes/chat.routes";
import { wsRoutes } from "./routes/ws.routes";
import { logError } from "./utils/errorHandler";
import { colorLog, redLogError } from "./utils/logger";
import { CONFIG } from "./config";

import "./db/database";

const chatServer: FastifyInstance = fastify({ logger: true });

chatServer.setErrorHandler((error, request, reply) => {
	logError(error, "Chat server");
	redLogError("Handling error:", error);
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

// Health check endpoint
chatServer.get('/health', async () => {
	return { status: 'ok', service: 'chat', timestamp: new Date().toISOString() };
});

const run = async () => {
	try {
		colorLog("cyan", "Start Chat service");
		await chatServer.listen({ port: CONFIG.SERVER.PORT, host: CONFIG.SERVER.HOST });
		colorLog("green", "Chat service is ready");
	} catch (e) {
		logError(e, "Can not run chat server");
		redLogError("Chat server error:", e);
		process.exit(1);
	}
};

run();
