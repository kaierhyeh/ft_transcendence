/**
 * Internal Authentication Middleware for Auth Service
 * 
 * This middleware secures internal service-to-service communication.
 * OAuth2-like client credentials flow for service-to-service authentication.
 * Services authenticate using client_id and client_secret to get internal access tokens.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import authService from '../services/auth.service';

export async function internalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Verify internal JWT token
        const validation = await authService.validateToken(token, 'INTERNAL_ACCESS' as any);
        if (validation.valid) {
          console.log(`🔓 Internal access granted via JWT`);
          return; // Access granted
        }
      } catch (error) {
        console.warn(`🚨 Invalid internal JWT: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return reply.status(401).send({ 
      error: 'Unauthorized: Valid internal JWT token required',
      hint: 'Obtain token via /auth/internal endpoint with client credentials'
    });
    
  } catch (error) {
    console.error('Internal auth middleware error:', error);
    return reply.status(500).send({ error: 'Internal authentication error'});
  }
}