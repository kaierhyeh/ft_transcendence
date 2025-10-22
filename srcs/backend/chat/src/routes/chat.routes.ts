import { FastifyInstance } from "fastify";
import { ChatController } from "../controllers/chats.controller";
import { UserIdParams, userIdSchema } from "../schemas/users.schema";
import { ChatIdParams, chatIdSchema } from "../schemas/chats.schema";
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
	
	// Find chat by user id or create new chat [Requires user authentication]
	fastify.get<{ Params: UserIdParams }>(
		"/open/:id",
		{
			schema: { params: userIdSchema },
			preHandler: userAuthMiddleware
		},
		chatController.getUserChat.bind(chatController)
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
