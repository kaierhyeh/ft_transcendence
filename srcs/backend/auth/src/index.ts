import fastify from "fastify";
import { authMiddleware } from './middleware/auth.middleware';
import { oauthRoutes } from './routes/oauth.routes';
import { twofaRoutes } from './routes/twofa.routes';
import { authRoutes } from './routes/auth.routes';
import { jwksRoutes } from './routes/jwks.routes';
import cookie from "@fastify/cookie";
import { config } from './config';
import { Logger } from './container';
import jwksService from './services/jwks.service';

async function startServer() {
	const app = fastify({ 
		logger: {
			transport: {
				target: 'pino-pretty',
				options: { translateTime: 'HH:MM:ss Z' }
			}
		}
	});

	// Register plugins
	await app.register(cookie);

	// Initialize logger
	try {
		const logger = new Logger(app);
		app.decorate('logger', logger);

		// Initialize JWKS service with three-type keys
		await jwksService.generateJWKS();
		
		app.log.info('✅ Services initialized successfully');
	} catch (error) {
		app.log.error(error, '❌ Service initialization error:');
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
	try {
		await app.listen({
			port: config.server.port,
			host: config.server.host
		});
		app.log.info('🚀 Auth service started successfully');
	} catch (error) {
		app.log.error(`❌ Error starting auth service: ${(error as Error).message}`);
		process.exit(1);
	}
}

// Start the server
startServer().catch((error) => {
	console.error('❌ Failed to start auth service:', error);
	process.exit(1);
});