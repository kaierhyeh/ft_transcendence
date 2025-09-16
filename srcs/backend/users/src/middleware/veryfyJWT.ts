import { FastifyReply, FastifyRequest } from "fastify";
import { JwtPayload } from "../types";

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

export async function verifyJWT(req: FastifyRequest, reply: FastifyReply) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: "Missing or malformed token" });
    }

    const token = authHeader.split(' ')[1];
    
    // Use our custom verification function
    const payload = await req.server.verifyToken(token);
    
    req.user = payload; // Attach to request
  } catch (err) {
    return reply.status(401).send({
      error: "Invalid or expired token",
      details: err instanceof Error ? err.message : "Token verification failed",
    });
  }
}
