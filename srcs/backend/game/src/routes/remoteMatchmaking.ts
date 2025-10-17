import { FastifyInstance } from "fastify";
import { matchmakingRequestSchema, GameParticipant } from "../schemas";

function handleJoinRequest(request: any, reply: any): void {
  // const mode = request.body.mode;
  // const participant_id = request.body.participant_id;

  // const participant: GameParticipant = {
  //   user_id: 0,
  //   participant_id: participant_id,
  //   is_ai: false
  // };

  // const fastify = request.server;
  // const response = fastify.matchmaking.joinQueue(participant, mode);
  // reply.send(response);
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

function handleWebSocketConnection(connection: any, request: any): void {
  const participantId = request.query.participant_id;
  const fastify = request.server;
  
  if (!participantId) {
    connection.socket.close(4001, "Missing participant_id");
    return;
  }
  
  const isInQueue = fastify.matchmaking.isPlayerAlreadyInQueue(participantId);
  if (!isInQueue) {
    connection.socket.close(4002, "Not in queue");
    return;
  }
  
  fastify.matchmaking.saveWebSocket(participantId, connection);
  
  connection.socket.on("message", function(message: string) {
    try {
      const data = JSON.parse(message);
      if (data.type == "ping") {
        connection.socket.send(JSON.stringify({ type: "pong" }));
      }
    } catch (error) {
      console.error("Invalid message:", error);
    }
  });
  
  connection.socket.on("close", function() {
    fastify.matchmaking.removeWebSocket(participantId);
  });
  
  connection.socket.on("error", function() {
    fastify.matchmaking.removeWebSocket(participantId);
  });
}

export default function matchmakingRoutes(fastify: FastifyInstance, options: any, done: Function): void {

  fastify.post("/join", { schema: { body: matchmakingRequestSchema } }, handleJoinRequest);

  fastify.get("/status", handleStatusRequest);

  fastify.get("/ws", { websocket: true }, handleWebSocketConnection);

  done();
}