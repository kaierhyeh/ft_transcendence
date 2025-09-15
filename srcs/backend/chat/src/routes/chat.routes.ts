// registers endpoints (fastify.get(...), fastify.post(...)) and maps them to controller functions.

import	{
		FastifyInstance,
		FastifyPluginAsync
		} from "fastify";

import	{
		getChatPartnersController
		} from "../controllers/chats.controller";

import	{
		postMessagesController,
		getMessagesController,
		deleteMessageController
		} from "../controllers/messages.controller";
import { colorLog } from "../utils/logger";

export const chatRoutes: FastifyPluginAsync = async (fastify:FastifyInstance): Promise<void> => {

	// empty routes
	// fastify.get('/', async () => { return { message: 'Hello from Fastify 🚀' }; });
	// fastify.get('/about', async () => { return { message: 'This is the about route' }; });

	// chat routes
	colorLog("cyan", fastify)
	fastify.post("/messages", postMessagesController);
	fastify.get("/messages/:userId", getMessagesController);
	fastify.delete("/messages/:id", deleteMessageController);
	fastify.get("/chats/:userId", getChatPartnersController);

};
