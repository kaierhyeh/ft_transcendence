import { FastifyInstance } from "fastify";
import { MessageController } from "../controllers/messages.controller";
import { GameInfoParams, gameInfoSchema, NewMessageBody, newMessageSchema } from "../schemas/messages.schema";
import { userAuthMiddleware } from "../middleware/userAuth";
import { internalAuthMiddleware } from "../middleware/internalAuth";

export default async function messagesRoutes(fastify: FastifyInstance) {
    const messageController = new MessageController(fastify.services.message);

    // Send msg  [Requires user authentication]
    fastify.post<{ Body: NewMessageBody }>(
        "/",
        {
            schema: { body: newMessageSchema },
            preHandler: userAuthMiddleware
        },
        messageController.addMessage.bind(messageController)
    );

	// Create chat on game created [Internal use only]
	fastify.post<{ Body: GameInfoParams }>(
		"/gamecreated",
		{
			schema: { body: gameInfoSchema },
			preHandler: internalAuthMiddleware
		},
		messageController.notifyAboutGame.bind(messageController)
	);
}
