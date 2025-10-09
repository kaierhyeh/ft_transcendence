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
import { userAuthMiddleware } from "../middleware/userAuth";

export const chatRoutes: FastifyPluginAsync = async (fastify:FastifyInstance): Promise<void> => {

	// empty routes
	// fastify.get('/', async () => { return { message: 'Hello from Fastify 🚀' }; });
	// fastify.get('/about', async () => { return { message: 'This is the about route' }; });

	// chat routes
	// colorLog("cyan", fastify)
	fastify.post<{Body:{msg:{fromId:number, toId:number, msg:string}}}>(
		"/messages",
		{ preHandler: userAuthMiddleware }, 
		postMessagesController);
	fastify.get<{ Params: { chatId: string; userId: string } }>(
		"/messages/:chatId/:userId", 
		{ preHandler: userAuthMiddleware }, 
		getMessagesController
	);
	fastify.delete("/messages/:id", deleteMessageController);
	fastify.get("/chats/:userId", getChatPartnersController);

};
