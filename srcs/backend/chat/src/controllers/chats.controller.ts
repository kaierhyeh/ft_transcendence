// the controller (HTTP routes).
// it connects Fastify routes (/chats, /chats/:id, ..) to the service methods
// contains the actual handler functions (just pure functions)

import	{
		FastifyReply,
		FastifyRequest
		} from "fastify";

import	{
		getChatPartnersService,
		deleteChatService
		} from "../services/chats.service";

import	{
		sendMessageService,
		getMessagesService,
		deleteMessageService
		} from "../services/messages.service";
		
import	{
		logError,
		getErrorCode,
		getErrorMessage
		} from "../utils/errorHandler";

export async function getChatController(req: FastifyRequest<{ Params:{ userId:number }}>, res: FastifyReply) {
	try {
		const chats = await getChatPartnersService(req.params.userId);
		return (res.send(chats));
	} catch (e: any) {
		logError(e, "getChatController");
		return (res.status(getErrorCode(e)).send({ e:getErrorMessage(e) }));
	}
}
