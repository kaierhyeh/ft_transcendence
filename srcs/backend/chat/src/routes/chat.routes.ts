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
import { userAuthMiddleware } from "../middleware/userAuth";

export const chatRoutes: FastifyPluginAsync = async (fastify:FastifyInstance): Promise<void> => {

	fastify.post<{Body:{msg:{fromId:number, toId:number, msg:string}}}>(
		"/messages",
		{ 
			preHandler: userAuthMiddleware 
		}, 
		postMessagesController);

	fastify.get<{ Params: { chatId: string; userId: string } }>(
		"/messages/:chatId/:userId", 
		{
			preHandler: userAuthMiddleware 
		}, 
		getMessagesController
	);

	fastify.delete("/messages/:id", deleteMessageController);

	fastify.get("/chats/:userId", getChatPartnersController);


	// fastify.get(
	// 	"/chats", 
	// 	{
	// 		preHandler: userAuthMiddleware 
	// 	}, 
	// 	getChatPartnersController
	// );

};
