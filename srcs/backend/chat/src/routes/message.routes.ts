import { FastifyInstance } from "fastify";
import { MessageController } from "../controllers/messages.controller";
import { NewMessageBody, newMessageSchema } from "../schemas/messages.schema";
import { userAuthMiddleware } from "../middleware/userAuth";

export default async function messagesRoutes(fastify: FastifyInstance) {
    const messageController = new MessageController(fastify.services.message);

    // Register WS connection
    // fastify.

    // Delete WS connection

    // Send msg
    fastify.post<{ Body: NewMessageBody }>(
        "/",
        {
            schema: { body: newMessageSchema },
            preHandler: userAuthMiddleware
        },
        messageController.addMessage.bind(messageController)
    );

}
