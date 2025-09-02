import { FastifyInstance, FastifyRequest } from "fastify";
import { createGameSchema, GameCreationBody, GameIdParams,gameIdSchema,JoinGameBody, joinGameSchema} from "../schemas";
import { SocketStream } from "@fastify/websocket";

export default async function gameRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: GameCreationBody }>(
    "/create",
    { schema: { body: createGameSchema } },
    async (request, reply) => {
      const { type, participants } = request.body;
      const game_id = fastify.sessions.createGameSession(type, participants);
      reply.status(201).send({game_id: game_id});
  });

  fastify.get<{ Params: GameIdParams }>(
    "/:id/conf", 
    { schema: { params: gameIdSchema } },
    async (request, reply) => {
      const { id } = request.params;
      const session = fastify.sessions.getGameSession(id);
      if (!session) return reply.status(404).send({ error: "Game not found"});
      reply.send(session.conf);
  });

  fastify.post<{ Params: GameIdParams; Body: JoinGameBody}>(
    "/:id/join",
    { schema: joinGameSchema},
    async (request, reply) => {
      const { id } = request.params;
      const { participant } = request.body;
      
      const result =  fastify.sessions.joinGameSession(id, participant);
      if (result.success)
        reply.status(result.status).send({ success: true, message: result.msg });
      else
        reply.status(result.status).send({ success: false, error: result.msg });
  });

  // WebSocket endpoint for real-time game updates
  fastify.get<{ Params: GameIdParams }>(
    "/:id/ws",
    { schema: { params: gameIdSchema }, websocket: true },
    (connection, request) => {
      const { id } = request.params;

      fastify.sessions.connectToGameSession(id, connection);
    }
  );
  // fastify.get<{ Params: GameIdParams }>(
  //   '/:id/ws', 
  //   { schema: { params: gameIdSchema }, websocket: true },
  //   (connection: SocketStream, request) => {
  //     const { id } = request.params;


  //   const game_id = parseInt(id, 10);
    
  //   if (isNaN(game_id)) {
  //     connection.socket.close(1011, "Invalid game ID");
  //     return;
  //   }

  //   const game_session: GameSession | undefined = game_sessions.get(game_id);
  //   if (game_session === undefined) {
  //     connection.socket.close(1011, "Game id doens't exist");
  //     return ;
  //   }
  //   const { websockets } = game_session?.state as {websockets: Set<SocketStream>};

  //   websockets.add(connection);
  //   game_session.state.last_connection_time = Date.now(); // Update when connection added
    
  //   connection.socket.on('message', (message: Buffer) => {
  //     try {
  //       const input: PlayerInputMessage = JSON.parse(message.toString()) as PlayerInputMessage;
        
  //       // Validate input structure
  //       if (!input.type || input.type !== "input" || !input.session_id || !input.move || (input.move !== "up" && input.move !== "down")) {
  //         throw new Error("Invalid input format");
  //       }
        
  //       const player: PlayerState | undefined = Array.from(game_session.state.players.values())
  //         .find((player) => player.session_id === input.session_id);
  //       if (player === undefined) {
  //         throw new Error("Invalid session id");
  //       }
        
  //       // Process player movement
  //       if (input.move === "up" && player.paddle_coord > 0) {
  //         player.paddle_coord -= PADDLE_STEP;
  //       }
        
  //       if (input.move === "down" && player.paddle_coord < HEIGHT - PADDLE_HEIGHT) {
  //         player.paddle_coord += PADDLE_STEP;
  //       }
        
  //     } catch (err) {
  //       const errorMessage = err instanceof Error ? err.message : String(err);
  //       fastify.log.error('Invalid message: ' + errorMessage);
  //       // TODO: you may inform the client of the problem
  //     }
  //   });
    
  //   connection.socket.on('close', () => {
  //     fastify.log.warn("A connection closed on game " + game_session.id);
  //     websockets.delete(connection);
  //     game_session.state.last_connection_time = Date.now(); // Update when connection removed
  //   });
    
  //   connection.socket.on('error', (error: Error) => {
  //     // Fix: Convert Error to string for logging
  //     fastify.log.error('WebSocket error: ' + error.message);
  //     websockets.delete(connection);
  //   });
    
  //   const public_game_state: PublicGameState = toPublicGameState(game_session.state);
  //   // Send initial game state
  //   connection.socket.send(JSON.stringify(public_game_state));
  // });
}
