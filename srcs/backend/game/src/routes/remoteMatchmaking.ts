import { FastifyInstance } from "fastify";
import { matchmakingRequestSchema, GameParticipant } from "../schemas";

function handleJoinRequest(request: any, reply: any): void {
  const mode = request.body.mode;
  const participant_id = request.body.participant_id;

  const participant: GameParticipant = {
    user_id: 0,
    participant_id: participant_id,
    is_ai: false
  };

  const fastify = request.server;
  const response = fastify.matchmaking.joinQueue(participant, mode);
  reply.send(response);
}

function handleStatusRequest(request: any, reply: any): void {
  const fastify = request.server;
  const status2p = fastify.matchmaking.getQueueStatus("2p");
  const status4p = fastify.matchmaking.getQueueStatus("4p");
  
  reply.send({
    queue_2p: status2p,
    queue_4p: status4p
  });
}

export default function matchmakingRoutes(fastify: FastifyInstance): void {
  
  fastify.post("/join", { schema: { body: matchmakingRequestSchema } }, handleJoinRequest);
  
  fastify.get("/status", handleStatusRequest);
}