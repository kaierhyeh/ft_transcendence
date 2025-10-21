import { FastifyInstance } from "fastify";
import { internalAuthMiddleware } from "../middleware/internalAuth";

export default async function statsRoutes(fastify: FastifyInstance) {
  // GET /:user_id/lite - Get lite stats for a user [protected]
  fastify.get<{ Params: { user_id: number } }>(
    "/:user_id/lite",
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            user_id: { type: 'number' }
          },
          required: ['user_id']
        }
      },
      preHandler: internalAuthMiddleware
    },
    async (request, reply) => {
      const { user_id } = request.params;
      const stats = fastify.stats_repo.getLiteStats(user_id);
      
      if (!stats)
        return reply.status(404).send({ error: "Stats not found" });
      
      reply.send(stats);
  });

  // GET /leaderboard - Get leaderboard [protected]
  fastify.get<{ Querystring: { limit?: number } }>(
    "/leaderboard",
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10 }
          }
        }
      },
      preHandler: internalAuthMiddleware
    },
    async (request, reply) => {
      const { limit = 10 } = request.query;
      const leaderboard = fastify.stats_repo.getLeaderboard(limit);
      
      reply.send(leaderboard);
  });

  // POST /update - Update stats for a user [protected]
  fastify.post<{ Body: { user_id: number; won: boolean; points_scored: number } }>(
    "/update",
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            user_id: { type: 'number' },
            won: { type: 'boolean' },
            points_scored: { type: 'number' }
          },
          required: ['user_id', 'won', 'points_scored']
        }
      },
      preHandler: internalAuthMiddleware
    },
    async (request, reply) => {
      const { user_id, won, points_scored } = request.body;
      
      // Get current stats
      let currentStats = fastify.stats_repo.getLiteStats(user_id);
      if (!currentStats) {
        currentStats = {
          wins: 0,
          losses: 0,
          curr_winstreak: 0,
          best_winstreak: 0,
          total_points_scored: 0
        };
      }

      const newStats = { ...currentStats };
      if (won) {
        newStats.wins += 1;
        newStats.curr_winstreak += 1;
        if (newStats.curr_winstreak > newStats.best_winstreak)
          newStats.best_winstreak = newStats.curr_winstreak;
      } else {
        newStats.losses += 1;
        newStats.curr_winstreak = 0;
      }
      newStats.total_points_scored += points_scored;

      fastify.stats_repo.upsertStats(user_id, newStats);
      
      reply.send({ success: true });
  });
}
