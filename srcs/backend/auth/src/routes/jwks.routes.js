import jwksService from '../services/jwks.service.js';

export async function jwksRoutes(fastify, options) {
	
	/**
	 * JWKS endpoint - RFC 7517 compliant
	 * Standard endpoint for JWT key discovery
	 */
	fastify.get('/.well-known/jwks.json', {
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
	}, async (request, reply) => {
		try {
			const jwksData = jwksService.getJWKSWithCacheInfo();
			
			// Set cache headers for better performance
			reply.headers({
				'Content-Type': 'application/json',
				'Cache-Control': `public, max-age=${jwksData.cacheMaxAge}`,
				'ETag': `"${jwksData.keyId}"`,
				'Last-Modified': new Date(jwksData.lastGenerated).toUTCString(),
				'X-Key-ID': jwksData.keyId
			});

			fastify.log.info(`JWKS requested - Key ID: ${jwksData.keyId}`);
			
			return jwksData.jwks;
			
		} catch (error) {
			fastify.log.error(error, 'Error serving JWKS.');
			return reply.code(500).send({
				error: 'Internal server error.',
				message: 'Failed to retrieve JWKS.'
			});
		}
	});

	/**
	 * Debug endpoint to show JWKS info (remove in production)
	 */
	fastify.get('/debug/jwks', async (request, reply) => {
		try {
			const jwksData = jwksService.getJWKSWithCacheInfo();
			
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
			fastify.log.error(error, 'Error in JWKS debug endpoint.');
			return reply.code(500).send({
				error: 'Internal server error.'
			});
		}
	});

	/**
	 * Refresh JWKS endpoint (for future key rotation)
	 */
	fastify.post('/admin/jwks/refresh', {
		preHandler: async (request, reply) => {
			// TODO: Add admin authentication
			// For now, just log the request
			fastify.log.warn('JWKS refresh requested - should implement admin auth.');
		}
	}, async (request, reply) => {
		try {
			jwksService.refresh();
			const jwksData = jwksService.getJWKSWithCacheInfo();
			
			fastify.log.info(`JWKS refreshed - New Key ID: ${jwksData.keyId}`);
			
			return {
				success: true,
				message: 'JWKS refreshed successfully.',
				newKeyId: jwksData.keyId,
				refreshedAt: jwksData.lastGenerated
			};
			
		} catch (error) {
			fastify.log.error(error, 'Error refreshing JWKS.');
			return reply.code(500).send({
				success: false,
				error: 'Failed to refresh JWKS'
			});
		}
	});
}