import jwksService from '../services/jwks.service';

export default async function jwksRoutes(fastify: any, options: any): Promise<void> {
	const logger = (fastify as any).logger;
	
	/**
	 * JWKS endpoint - RFC 7517 compliant
	 * Standard endpoint for JWT key discovery
	 */
	fastify.get('/jwks.json', {
		schema: {
			description: 'JSON Web Key Set endpoint for JWT verification',
			tags: ['JWKS'],
			response: {
				200: {
					description: 'JWKS response',
					type: 'object',
					properties: {
						keys: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									kty: { type: 'string' },
									use: { type: 'string' },
									alg: { type: 'string' },
									kid: { type: 'string' },
									n: { type: 'string' },
									e: { type: 'string' }
								}
							}
						}
					}
				}
			}
		}
	}, async (request: any, reply: any) => {
		try {
			const jwksData = await jwksService.getJWKSWithCacheInfo();
			
			// Set cache headers for better performance
			reply.headers({
				'Content-Type': 'application/json',
				'Cache-Control': `public, max-age=${jwksData.cacheMaxAge}`,
				'ETag': `"${jwksData.keyId}"`,
				'Last-Modified': jwksData.lastGenerated ? new Date(jwksData.lastGenerated).toUTCString() : new Date().toUTCString(),
				'X-Key-ID': jwksData.keyId
			});

			fastify.log.info(`JWKS requested - Key ID: ${jwksData.keyId}`);
			
			return jwksData.jwks;
			
		} catch (error) {
			logger.error('Error serving JWKS', error as Error, {
				ip: (request as any).ip
			});
			return reply.code(500).send({
				error: 'Internal server error.',
				message: 'Failed to retrieve JWKS.'
			});
		}
	});

	// // Debug endpoint to show JWKS info (remove in production)
	fastify.get('/debug/jwks', async (request: any, reply: any) => {
		try {
			const jwksData = await jwksService.getJWKSWithCacheInfo();
			
			return {
				...jwksData,
				publicKey: '*** HIDDEN FOR SECURITY ***', // Don't expose raw key
				debug: {
					keyCount: jwksData.jwks.keys.length,
					algorithms: jwksData.jwks.keys.map(k => k.alg),
					keyIds: jwksData.jwks.keys.map(k => k.kid),
					usage: jwksData.jwks.keys.map(k => k.use)
				}
			};
			
		} catch (error) {
			logger.error('Error in JWKS debug endpoint', error as Error, {
				ip: (request as any).ip
			});
			return reply.code(500).send({
				error: 'Internal server error.'
			});
		}
	});

	// Refresh JWKS endpoint (for future key rotation)
	fastify.post('/admin/jwks/refresh', {
		preHandler: async (request: any, reply: any) => {
			// TODO: Add admin authentication
			// For now, just log the request
			logger.warn('JWKS refresh requested - should implement admin auth', {
				ip: (request as any).ip
			});
		}
	}, async (request: any, reply: any) => {
		try {
			await jwksService.refresh();
			const jwksData = await jwksService.getJWKSWithCacheInfo();
			
			logger.info('JWKS refreshed successfully', {
				newKeyId: jwksData.keyId,
				ip: (request as any).ip
			});
			
			return {
				success: true,
				message: 'JWKS refreshed successfully.',
				newKeyId: jwksData.keyId,
				refreshedAt: jwksData.lastGenerated
			};
			
		} catch (error) {
			logger.error('Error refreshing JWKS', error as Error, {
				ip: (request as any).ip
			});
			return reply.code(500).send({
				success: false,
				error: 'Failed to refresh JWKS'
			});
		}
	});
}