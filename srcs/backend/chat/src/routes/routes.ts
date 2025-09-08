// registers endpoints (fastify.get(...), fastify.post(...)) and maps them to controller functions.

import	{
		FastifyInstance
		} from "fastify";

import	{
		getChatController
		} from "../controllers/chats.controller";

import	{
		sendMessagesController,
		getMessagesController,
		deleteMessageController
		} from "../controllers/messages.controller";

import	{
		getChatSchema
		} from "../schemas/chats.schema";

export default async function routes(fastify: FastifyInstance) {
	fastify.post("/messages", sendMessagesController);
	fastify.get("/messages/:userId", getMessagesController);
	fastify.delete("/messages/:id", deleteMessageController);
	fastify.get("/chats/:userId", { schema:getChatSchema }, getChatController);
}
