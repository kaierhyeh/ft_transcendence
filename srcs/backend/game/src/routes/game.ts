import { FastifyInstance } from "fastify";
import { createGameSchema, GameCreationData, GameIdParams,gameIdSchema } from "../schemas";
import { userAuthMiddleware } from "../middleware/userAuth";
import { toInteger } from "../utils/type-converters";
// import { internalAuthMiddleware } from "../middleware/internalAuth";

export default async function gameRoutes(fastify: FastifyInstance) {
  // POST /create - Create a new game session [protected]
  fastify.post<{ Body: GameCreationData }>(
    "/create",
    { 
      schema: { body: createGameSchema },
    },
    async (request, reply) => {
      const data = request.body;
      try {
        const game_id = await fastify.live_sessions.createGameSession(data);
        reply.status(201).send({game_id: game_id});
      } catch(error: any) {
        // Handle known validation errors with appropriate status codes
        const status = error.status || 500;
        const code = error.code;
        
        if (code === 'INVALID_PARTICIPANTS_NUMBER' ||
            code === 'INVALID_INVITATION_FORMAT' ||
            code === 'INVALID_INVITATION_MODE' ||
            code === 'INVALID_INVITATION_ONLINE' ||
            code === 'INVALID_INVITATION_PARTICIPANTS' ||
            code === 'INVITATION_BLOCKED' ||
            code === 'MISSING_USER_ID' ||
            code === 'PARTICIPANT_ID_MISMATCH' ||
            code === 'DUPLICATE_USER') {
          return reply.status(status).send({ error: error.message, code });
        }
        
        // Log unexpected errors
        fastify.log.error(error);
        reply.status(500).send({ error: "Internal server error" });
      }
  });

  fastify.delete<{ Params: GameIdParams }>(
    "/:id",
    {
      preHandler: userAuthMiddleware,
      schema: { params: gameIdSchema },
    }, async (request, reply) => {
      const { id } = request.params;
      const sub = request.authUser?.sub; // `sub` is the user ID in the JWT payload
      
      if (!sub) {
        return reply.status(401).send({ error: "Unauthorized: No user context" });
      }

      try {
        const userId = toInteger(sub);
        fastify.live_sessions.deleteGameSession(id, userId);
        reply.status(204).send();
      } catch(error: any) {
        // Handle known validation errors with appropriate status codes
        const status = error.status || 500;
        const code = error.code;
        
        if (code === 'GAME_NOT_FOUND' ||
            code === 'CANNOT_DELETE_ACTIVE_GAME' ||
            code === 'NOT_GAME_CREATOR') {
          return reply.status(status).send({ error: error.message, code });
        }
        
        // Log unexpected errors
        fastify.log.error(error);
        reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  // GET /:id/conf - Get game session configuration
  fastify.get<{ Params: GameIdParams }>(
    "/:id/conf", 
    { schema: { params: gameIdSchema } },
    async (request, reply) => {
      const { id } = request.params;
      const conf = fastify.live_sessions.getGameSessionConf(id);
      if (!conf) return reply.status(404).send({ error: "Game not found"});
      reply.send(conf);
  });

  // GET /:id/access-status - Check if user can access an invitation game
  fastify.get<{ Params: GameIdParams }>(
    "/:id/access-status",
    {
      preHandler: userAuthMiddleware,
      schema: { params: gameIdSchema }
    },
    async (request, reply) => {
      const { id } = request.params;
      const sub = request.authUser?.sub;
      
      if (!sub) {
        return reply.status(401).send({ error: "Unauthorized: No user context" });
      }

      try {
        const userId = toInteger(sub);
        fastify.live_sessions.checkGameAccess(id, userId);
        reply.status(204).send();
      } catch (error: any) {
        const status = error.status || 500;
        const code = error.code;
        
        if (code === 'GAME_NOT_FOUND' ||
            code === 'NOT_INVITATION_GAME' ||
            code === 'UNAUTHORIZED_ACCESS') {
          return reply.status(status).send({ error: error.message, code });
        }
        
        fastify.log.error(error);
        reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  // GET /:id/ws - WebSocket endpoint for real-time game updates
  fastify.get<{ Params: GameIdParams }>(
    "/:id/ws",
    { schema: { params: gameIdSchema }, websocket: true },
    (connection, request) => {
      const { id } = request.params;
      fastify.live_sessions.connectToGameSession(id, connection, request);
    }
  );
}
