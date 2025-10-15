import { FastifyInstance } from "fastify";
import { ChatController } from "../controllers/chats.controller";
import { ChatIdParams, chatIdSchema } from "../schemas/users.schema";
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
	fastify.get<{ Params: ChatIdParams }>(
		"/:id",
		{
			schema: { params: chatIdSchema },
			preHandler: userAuthMiddleware
		},
		chatController.getChatById.bind(chatController)
	);

}
