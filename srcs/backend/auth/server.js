import fastify from "fastify";
import redis from './redis/redisClient.js';
import { initializeDatabase } from './db/schema.js';
import { authMiddleware } from './auth.middleware.js';
import { oauthRoutes } from './routes/oauth.routes.js';
import { twofaRoutes } from './routes/twofa.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from '@fastify/multipart';
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

await app.register(multipart, {
	attachFieldsToBody: 'auto',
	limits: {
		fileSize: 2 * 1024 * 1024 // 2MB
	}
});

// Initialize database
try {
	const db = initializeDatabase(process.env.DATABASE_URL || './data/database.db');
	
	// Create default deleted user
	db.prepare(`
		INSERT OR IGNORE INTO users (id, username, password)
		VALUES (0, '[deleted]', '')
	`).run();

	app.decorate('db', db);
	app.log.info('Database initialized successfully');
} catch (error) {
	app.log.error(error, 'Database initialization error:');
	process.exit(1);
}

// Public routes that don't need authentication
const publicRoutes = [
	'/auth/google',
	'/auth/google/username',
	'/auth/login',
	'/auth/register',
	'/auth/refresh',
	'/2fa/verify',
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

// Register routes
await app.register(oauthRoutes);
await app.register(twofaRoutes);
await app.register(authRoutes);

// Health check endpoint
app.get('/health', async (request, reply) => {
	return { status: 'ok', service: 'auth', timestamp: new Date().toISOString() };
});

// Graceful shutdown
const cleanup = async (signal) => {
	app.log.info(`${signal} received. Cleaning up auth service...`);
	try {
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
			port: process.env.PORT || 3000, 
			host: '0.0.0.0' 
		});
		app.log.info('Auth service started successfully');
	} catch (error) {
		app.log.error('Error starting auth service:', error);
		process.exit(1);
	}
};

start();