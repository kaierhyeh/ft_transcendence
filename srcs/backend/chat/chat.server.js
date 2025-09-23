import fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import WebSocket from "@fastify/websocket";
import { initializeDatabase } from "../shared/db/schema.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import dotenv from 'dotenv';

dotenv.config();

const app = fastify({ 
	logger: {
		transport: {
			target: 'pino-pretty',
			options: { translateTime: 'HH:MM:ss Z' }
		}
	}
});

// Register plugins
await app.register(cors, {
	origin: true,
	credentials: true
});

await app.register(cookie);

// Configure WebSocket
await app.register(WebSocket, {
	options: { 
		maxPayload: 1048576,
		clientTracking: true
	}
});

// Store active WebSocket connections
app.decorate('connections', new Map());

// Initialize database
try {
	const db = initializeDatabase(process.env.DATABASE_URL || './data/database.db');
	
	// Create default deleted user
	db.prepare(`
		INSERT OR IGNORE INTO users (id, username, password)
		VALUES (0, '[deleted]', '')
	`).run();

	app.decorate('db', db);
	app.log.info('Database initialized successfully.');
} catch (error) {
	app.log.error(error, 'Database initialization error:');
	process.exit(1);
}

// Public routes that don't need authentication
const publicRoutes = [
	'/ws',
	'/health'
];

// Apply auth middleware to all routes except public ones
app.addHook('onRequest', (request, reply, done) => {
	if (request.method === 'OPTIONS' || 
		publicRoutes.some(route => request.url.startsWith(route))) {
		return done();
	}
	authMiddleware(app, request, reply, done);
});

// TODO: Register WebSocket routes here when they exist
// await app.register(wsRoutes);

// Health check endpoint
app.get('/health', async (request, reply) => {
	return { status: 'ok', service: 'chat', timestamp: new Date().toISOString() };
});

// Graceful shutdown
const cleanup = async (signal) => {
	app.log.info(`${signal} received. Cleaning up chat service...`);
	try {
		// Close all WebSocket connections
		if (app.connections && app.connections.size > 0) {
			app.connections.forEach((connection, userId) => {
				if (connection.readyState === connection.OPEN) {
					connection.close();
				}
			});
			app.connections.clear();
		}
		
		await app.close();
		process.exit(0);
	} catch (error) {
		app.log.error('Error during cleanup:', error);
		process.exit(1);
	}
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start server
const start = async () => {
	try {
		await app.listen({ 
			port: process.env.PORT || 3003, 
			host: '0.0.0.0' 
		});
		app.log.info('Chat service started successfully.');
	} catch (error) {
		app.log.error('Error starting chat service:', error);
		process.exit(1);
	}
};

start();