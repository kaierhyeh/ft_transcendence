import { FastifyInstance } from "fastify";
import { BlockController } from "../controllers/BlockController";
import { UserIdParams, userIdSchema } from "../schemas/blocks";
import { userAuthMiddleware } from "../middleware/userAuth";

export default async function blocksRoutes(fastify: FastifyInstance) {
	const blockController = new BlockController(fastify.services.blocks);

	// List blocked users [Requires user authentication] 
	fastify.get(
		"/",
		{
			preHandler: userAuthMiddleware
		},
		blockController.getBlockedUsers.bind(blockController)
		// get blocked list
	);
	
	// Block user [Requires user authentication] 
	fastify.post<{ Params: UserIdParams }>(
		"/:id",
		{
			schema: { params: userIdSchema },
			preHandler: userAuthMiddleware
		},
		blockController.blockUser.bind(blockController)
		// expected param: id (user to block)
	);

	// Unblok user [Requires user authentication]
	fastify.delete<{ Params: UserIdParams }>(
		"/:id",
		{
			schema: { params: userIdSchema },
			preHandler: userAuthMiddleware
		},
		blockController.unblockUser.bind(blockController)
	);

	// Check if blocked [Requires internal service authentication]
	fastify.get<{ Params: UserIdParams }>(
		"/check/:id",
		{
			schema: { params: userIdSchema },
			preHandler: userAuthMiddleware
		},
		blockController.isBlocked.bind(blockController)
	);

}
