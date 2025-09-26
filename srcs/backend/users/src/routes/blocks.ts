import { FastifyInstance } from "fastify";
import { verifyJWT } from "../middleware/verifyJWT";
import { BlockController } from "../controllers/BlockController";
import { UserIdParams, userIdSchema } from "../schemas/blocks";

export default async function blocksRoutes(fastify: FastifyInstance) {
	const blockController = new BlockController(fastify.services.blocks);

	// List blocked users [Requires user authentication] 
	fastify.get(
		"/",
		{
			preHandler: verifyJWT
		},
		blockController.getBlockedUsers.bind(blockController)
		// get blocked list
	);
	
	// Block user [Requires user authentication] 
	fastify.post<{ Params: UserIdParams }>(
		"/:id",
		{
			schema: { params: userIdSchema },
			preHandler: verifyJWT
		},
		blockController.blockUser.bind(blockController)
		// expected param: id (user to block)
	);

	// Unblok user [Requires user authentication]
	fastify.delete<{ Params: UserIdParams }>(
		"/:id",
		{
			schema: { params: userIdSchema },
			preHandler: verifyJWT
		},
		blockController.unblockUser.bind(blockController)
	);

	// Check if blocked [Requires internal service authentication]
	fastify.get<{ Params: UserIdParams }>(
		"/check/:id",
		{
			schema: { params: userIdSchema },
			preHandler: verifyJWT
		},
		blockController.isBlocked.bind(blockController)
	);

}
