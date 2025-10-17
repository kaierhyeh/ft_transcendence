import { FastifyInstance } from "fastify";
import { MatchMakingController } from '../controllers/MatchMakingController';
import { joinMatchSchema, MatchMakingData, matchMakingSchema } from "../schemas";

export default async function matchMakingRoutes(fastify: FastifyInstance) {
  const matchMakingController = new MatchMakingController();

  // Setup a match
  fastify.post<{ Body: MatchMakingData }>(
    "/make",
    { schema: { body: matchMakingSchema } },
    matchMakingController.make.bind(matchMakingController)
  );

  fastify.post(
    "/join",
    { schema: { body: joinMatchSchema } },
    matchMakingController.join.bind(matchMakingController)
  )

}
