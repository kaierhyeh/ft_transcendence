import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { CONFIG } from './config';
import routes from "./routes"
import jwksService from "./services/jwks.service";
import ajvErrors from "ajv-errors";
import { fastifyErrorHandler } from "./errors";


const fastify = Fastify({
	logger: true,
	ajv: {
		customOptions: {
			allErrors: true, // 👈 REQUIRED for ajv-errors
		},
		plugins: [ajvErrors], // 👈 enables `errorMessage` support
	},
});

async function run() {

	// Register global error handler
	fastify.setErrorHandler(fastifyErrorHandler);

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
