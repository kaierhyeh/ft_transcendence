import { FastifyInstance, FastifyRequest } from "fastify";
import { matchmakingRequestSchema, MatchmakingRequest } from "../schemas";

async function handleJoinRequest(request: FastifyRequest<{ Body: MatchmakingRequest }>, reply: any): Promise<void> {
  const {format, participant } = request.body;
  const fastify = request.server;
   try {
    const response = await fastify.matchmaking.joinQueue(participant, format);
    reply.send(response);
  } catch(error: any) {
    if (error.code === 'INVALID_PARTICIPANTS_NUMBER')
      reply.status(400).send(error.message);
    else if (error.code === 'INVALID_PARTICIPANT')
      reply.status(400).send(error.message);
    reply.status(500).send("Internal server error");
  }
}

function handleStatusRequest(request: any, reply: any): void {
  const fastify = request.server;
  const status1v1 = fastify.matchmaking.getQueueStatus("1v1");
  const status2v2 = fastify.matchmaking.getQueueStatus("2v2");
  
  reply.send({
    queue_1v1: status1v1,
    queue_2v2: status2v2
  });
}

function handleWebSocketConnection(connection: any, request: any): void {
  const participantId = request.query.participant_id;
  const fastify = request.server;
  
  console.log("Handling WebSocket connection for participant:", participantId);

  if (!participantId) {
    console.log("Missing participant_id");
    connection.close(4001, "Missing participant_id");
    return;
  }
  
  const isInQueue = fastify.matchmaking.isPlayerAlreadyInQueue(participantId);
  if (!isInQueue) {
    console.log(`Participant ${participantId} not in queue`);
    connection.close(4002, "Not in queue");
    return;
  }
  
  fastify.matchmaking.saveWebSocket(participantId, connection);
  
  connection.on("message", function(message: string) {
    try {
      const data = JSON.parse(message);
      if (data.type == "ping") {
        connection.send(JSON.stringify({ type: "pong" }));
      }
    } catch (error) {
      console.log("Invalid message:", error);
    }
  });
  
  connection.on("close", function() {
    fastify.matchmaking.removeWebSocket(participantId);
  });
  
  connection.on("error", function() {
    fastify.matchmaking.removeWebSocket(participantId);
  });
}

export default function matchmakingRoutes(fastify: FastifyInstance, options: any, done: Function): void {

  fastify.post<{ Body: MatchmakingRequest }>("/join", { schema: { body: matchmakingRequestSchema } }, handleJoinRequest);

  fastify.get("/status", handleStatusRequest);

  fastify.get("/ws", { websocket: true }, handleWebSocketConnection);

  done();
}