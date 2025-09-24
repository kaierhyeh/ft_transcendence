import { FastifyRequest, FastifyReply } from 'fastify';
import { MatchMakingService } from '../services/MatchMakingService';
import { MatchMakingData } from '../schemas';


export class MatchMakingController {
  private matchMakingService: MatchMakingService;
  constructor() {
    this.matchMakingService = new MatchMakingService();
  }

  public async make(
    request: FastifyRequest<{ Body: MatchMakingData }>, 
    reply: FastifyReply
  ) {
    try {
      const result = await this.matchMakingService.make(request.body);
      reply.status(201).send(result);
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: any, reply: FastifyReply) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      reply.status(409).send({ 
        error: "Username or email already exists" 
      });
    } else if (error.code === 'USER_NOT_FOUND') {
      reply.status(404).send({ 
        error: "User not found" 
      });
    } else if (error.code === 'LITE_STATS_NOT_FOUND') {
      reply.status(503).send({ 
        error: "Statistics service unavailable" 
      });
    } else if (error.code === 'FORBIDDEN_OPERATION') {
      reply.status(403).send({ 
        error: error.message || "Forbidden operation" 
      });
    } else if (error.status === 401 ) {
      reply.status(401).send({ 
        error: error.message || "Unauthorized" 
      });
    } else {
      reply.log.error(error);
      reply.status(500).send({ 
        error: "Internal server error" 
      });
    }
  }
}