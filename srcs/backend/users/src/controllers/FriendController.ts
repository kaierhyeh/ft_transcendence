import { FastifyRequest, FastifyReply } from 'fastify';
import { FriendService } from '../services/FriendService';

export class FriendController {
  constructor(private friendService: FriendService) {}


  private handleError(error: any, reply: FastifyReply) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      reply.status(409).send({ 
        error: "Username or email already exists" 
      });
    } else if (error.code === 'USER_NOT_FOUND') {
      reply.status(404).send({ 
        error: "User not found" 
      });
    } else {
      reply.log.error(error);
      reply.status(500).send({ 
        error: "Internal server error" 
      });
    }
  }
}