import fastify from "fastify";
import { initializeDatabase } from '../db/schema.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { oauthRoutes } from './routes/oauth.routes.js';
import { twofaRoutes } from './routes/twofa.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { jwksRoutes } from './routes/jwks.routes.js';
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from '@fastify/multipart';
import { config } from './config.js';
import { initializeContainer, Container, Logger, type ILoggerService } from './container.js';
import { initializeKeys } from './utils/generate-keys.js';
import jwksService from './services/jwks.service.js';

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
	attachFieldsToBody: true,
	limits: {
		fileSize: config.upload.maxFileSize
	}
});

// Initialize JWT keys before anything else
try {
	initializeKeys();
} catch (error) {
	console.error('❌ Key initialization failed:', error);
	process.exit(1);
}

// Initialize services using dependency injection
const container = initializeContainer();

// Initialize database through container
try {
	const db = initializeDatabase(config.database.url);

	// Create default deleted user
	db.prepare(`
		INSERT OR IGNORE INTO users (id, username, password)
		VALUES (0, '[deleted]', '')
	`).run();

	app.decorate('db', db);
	app.decorate('container', container);

	// Initialize logger with fastify instance
	const logger = new Logger(app);
	container.register('logger', () => logger);
	app.decorate('logger', logger);

	// Initialize JWKS service with three-type keys
	await jwksService.generateJWKS();
	
	app.log.info('Services initialized successfully');
} catch (error) {
	app.log.error(error, 'Service initialization error:');
	process.exit(1);
}// Public routes that don't need authentication

const publicRoutes = [
	'/auth/google',
	'/auth/google/username',
	'/auth/login',
	'/auth/register',
	'/auth/refresh',
	'/2fa/verify',
	'/health',
	'/.well-known/jwks.json',  // JWKS endpoint should be public
	'/debug/jwks'              // Debug endpoint (remove in production)
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
await app.register(jwksRoutes);

// Health check endpoint
app.get('/health', async (request, reply) => {
	return { status: 'ok', service: 'auth', timestamp: new Date().toISOString() };
});

// Graceful shutdown
const cleanup = async (signal: string) => {
	app.log.info(`${signal} received. Cleaning up auth service...`);
	try {
		await app.close();
		process.exit(0);
	} catch (error) {
		app.log.error(`Error during cleanup: ${(error as Error).message}`);
		process.exit(1);
	}
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start server
const start = async () => {
	try {
		await app.listen({
			port: config.server.port,
			host: config.server.host
		});
		app.log.info('Auth service started successfully');
	} catch (error) {
		app.log.error(`Error starting auth service: ${(error as Error).message}`);
		process.exit(1);
	}
};

start();