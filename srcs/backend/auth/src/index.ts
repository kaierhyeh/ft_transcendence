import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { CONFIG } from './config';
import routes from "./routes"
import jwksService from "./services/jwks.service";


const fastify = Fastify({ logger: true });

async function run() {

	// Register plugins
	await fastify.register(cookie);

	// Generate JWKS
	await jwksService.generateJWKS();

	// Register routes
	for (const { route, prefix } of routes) {
		await fastify.register(route, { prefix });
	}

	// Health check endpoint
	fastify.get('/health', async (request, reply) => {
		return { status: 'ok', service: 'auth', timestamp: new Date().toISOString() };
	});
  
	await fastify.listen({ 
		port: CONFIG.SERVER.PORT, 
		host: CONFIG.SERVER.HOST 
		// port: 3000,
		// host: "0.0.0.0",
	});
}

run().catch(console.error);
