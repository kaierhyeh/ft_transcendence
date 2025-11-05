/**
 * Simple Internal JWT Middleware for Game Service
 * 
 * Verifies that requests come from internal services with valid INTERNAL_ACCESS tokens
 * No complex permissions - just "are you an internal service?"
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyInternalJWT } from '../services/JwtVerifierService';

export async function internalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Internal auth failed: Missing or invalid authorization header');
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    console.log(`🔍 Verifying internal JWT for ${request.method} ${request.url}`);
    await verifyInternalJWT(token);
    console.log('✅ Internal JWT verified successfully');
        
  } catch (error) {
    console.log('❌ Internal JWT verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      url: request.url,
      method: request.method
    });
    return reply.status(401).send({ 
      error: 'Invalid internal JWT',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}