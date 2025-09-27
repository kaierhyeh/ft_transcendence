/**
 * Simple Internal JWT Middleware
 * 
 * Verifies that requests come from internal services with valid INTERNAL_ACCESS tokens
 * No complex permissions - just "are you an internal service?"
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyInternalJWT } from '../utils/jwt-verifier.js';

export async function internalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    // Just verify it's a valid internal JWT - that's enough!
    await verifyInternalJWT(token);
    
    // No need to store anything - we just needed to verify internal access
    
  } catch (error) {
    return reply.status(401).send({ 
      error: 'Invalid internal JWT',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}