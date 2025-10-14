import { FastifyInstance } from "fastify";
import { ChatController } from "../controllers/chats.controller";
import { UserIdParams, userIdSchema } from "../schemas/users.schema";
import { userAuthMiddleware } from "../middleware/userAuth";

export default async function chatsRoutes(fastify: FastifyInstance) {
	const chatController = new ChatController(fastify.services.chat);

	// List current user's chats [Requires user authentication]
	fastify.get(
		"/",
		{
			preHandler: userAuthMiddleware
		},
		chatController.getUserChats.bind(chatController)
	);

	// Get chat by id [Requires user authentication]
	// fastify.get<{ Params: UserIdParams }>(
	// 	"/:id",
	// 	{
	// 		schema: { params: userIdSchema },
	// 		preHandler: userAuthMiddleware
	// 	},
	// 	chatController.getChatById.bind(chatController)
	// );

}
