import { FastifyRequest, FastifyReply } from 'fastify';
import { MatchMakingService } from '../services/MatchMakingService';
import { JoinMatchData, MatchMakingData } from '../schemas';

export class MatchMakingController {
  private matchMakingService: MatchMakingService;

  constructor() {
    this.matchMakingService = new MatchMakingService();
  }

  public async make(
    request: FastifyRequest<{ Body: MatchMakingData }>, 
    reply: FastifyReply
  ) {
    const result = await this.matchMakingService.make(request.body);
    reply.status(201).send(result);
  }

  public async join(
    request: FastifyRequest<{ Body: JoinMatchData }>,
    reply: FastifyReply
  ) {
    const result = await this.matchMakingService.join(request.body);
    reply.status(200).send(result);
  }
}