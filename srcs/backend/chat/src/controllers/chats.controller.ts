// the controller (HTTP routes).
// it connects Fastify routes (/chats, /chats/:id, ..) to the service methods
// contains the actual handler functions (just pure functions)

import	{
		FastifyRequest,
		FastifyReply
		} from "fastify";

import	{
		getChatPartnersService,
		deleteChatService
		} from "../services/chats.service";
		
import	{
		logError,
		getErrorCode,
		getErrorMessage
		} from "../utils/errorHandler";
import { colorLog } from "../utils/logger";

export async function getChatPartnersController(req:FastifyRequest<{Params:{userId:string}}>, reply:FastifyReply) {
	colorLog("cyan", "getChatPartnersController");
	try {
		const chats = await getChatPartnersService(parseInt(req.params.userId));
		return (reply.send(chats));
	} catch (e) {
		logError(e, "getChatController");
		return (reply.status(getErrorCode(e)).send({error:getErrorMessage(e)}));
	}
}

export async function deleteChatController(req:FastifyRequest<{Params:{chatId:string}}>, reply:FastifyReply) {
	try {
		await deleteChatService(parseInt(req.params.chatId));
		return (reply.status(200).send({message: "Chat deleted successfully."}));
	} catch (e) {
		logError(e, "deleteChatController");
		return (reply.status(getErrorCode(e)).send({error:getErrorMessage(e)}));
	}
}
