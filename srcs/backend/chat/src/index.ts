import Fastify from "fastify";
import websocketPlugin from '@fastify/websocket';
import { CONFIG } from "./config";
import routes from "./routes/index.routes"
import repositoriesPlugin from "./plugins/repositories";
import servicesPlugin from "./plugins/services";
import cookie from "@fastify/cookie";

const fastify = Fastify({ logger: true });

async function run() {
	await fastify.register(cookie);
	await fastify.register(websocketPlugin);
	await fastify.register(repositoriesPlugin);
	await fastify.register(servicesPlugin);

	for (const { route, prefix } of routes) {
		await fastify.register(route, { prefix });
	}

	// Health check endpoint
	fastify.get('/health', async () => {
		return { status: 'ok', service: 'chat', timestamp: new Date().toISOString() };
	});

	await fastify.listen({ 
		port: CONFIG.SERVER.PORT, 
		host: CONFIG.SERVER.HOST 
	});
}

run().catch(console.error);
