// // the controller (HTTP routes).
// // it connects Fastify routes (/chats, /chats/:id, ..) to the service methods
// // contains the actual handler functions (just pure functions)

// import	{
// 		FastifyRequest,
// 		FastifyReply
// 		} from "fastify";

// import	{
// 		getChatPartnersService,
// 		deleteChatService
// 		} from "../services/chats.service";

// import	{
// 		postMessageService,
// 		getMessagesService,
// 		deleteMessageService
// 		} from "../services/messages.service";
		
// import	{
// 		logError,
// 		getErrorCode,
// 		getErrorMessage
// 		} from "../utils/errorHandler";
// import { colorLog } from "../utils/logger";

// export async function postMessageController(fromId:number, toId:number, msg:string) {
// 	colorLog("cyan", "postMessageController: ", fromId, toId, msg);
// 	try {
// 		if (!fromId || !toId || !msg)
// 			throw new Error("Invalid message data");
// 		const newMsg = await postMessageService(fromId, toId, msg);
// 		return (newMsg);
// 	} catch (e) {
// 		logError(e, "postMessageController");
// 		throw e;
// 	}	
// }

// export async function postMessagesController(req:FastifyRequest<{Body:{msg:{fromId:number, toId:number, msg:string}}}>, reply:FastifyReply) {
// // export async function postMessagesController(req:FastifyRequest<{Body:{msgs:{fromId:number, toId:number, msg:string}[]}}>, reply:FastifyReply) {
// 	colorLog("cyan", "postMessagesController: ", req.method, req.url);
// 	try {
// 		colorLog("cyan", "postMessagesController: body=", req.body);
// 		// const {msgs} = req.body;
// 		// if (!Array.isArray(msgs) || msgs.length === 0 || msgs.find(msg => !msg.fromId || !msg.toId || !msg.msg))
// 		// 	return (reply.code(400).send({error: "Invalid message data" }));
// 		// const newMsgs = await Promise.all(msgs.map(msg => postMessageService(msg.fromId, msg.toId, msg.msg)));
// 		const {msg} = req.body
// 		if (msg.fromId === undefined || msg.toId === undefined || msg.msg === undefined)
// 			return (reply.status(400).send({error: "Invalid message data" }));
// 		const newMsgs = await postMessageService(msg.fromId, msg.toId, msg.msg);
// 		colorLog("cyan", "postMessagesController: newMsgs=", newMsgs);
// 		return (reply.status(201).send(newMsgs));
// 	} catch (e: any) {
// 		logError(e, "postMessagesController");
// 		return (reply.status(getErrorCode(e)).send({error:getErrorMessage(e)}));
// 	}
// }

// export async function getMessagesController(req:FastifyRequest<{Params:{chatId:string, userId:string}}>, reply:FastifyReply) {
// 	colorLog("cyan", "getMessagesController: ", req.method, req.url);
// 	try {
// 		const userId = parseInt(req.params.userId);
// 		const chatId = parseInt(req.params.chatId);
// 		if (isNaN(chatId) || isNaN(userId) || chatId < 0 || userId < 0)
// 			return (reply.status(400).send({error: "Invalid chat ID or user ID"}));
// 		const msgs = await getMessagesService(chatId, userId);
// 		return (msgs);
// 	} catch (e) {
// 		logError(e, "getMessagesController");
// 		return (reply.status(getErrorCode(e)).send({error:getErrorMessage(e)}));
// 	}
// }

// export async function deleteMessageController(req:FastifyRequest<{Params:{msgId:string}}>, reply:FastifyReply) {
// 	colorLog("cyan", "deleteMessageController: ", req.method, req.url);
// 	try {
// 		await deleteMessageService(parseInt(req.params.msgId));
// 		return (reply.status(200).send({message: "Message deleted successfully."}));
// 	} catch (e) {
// 		logError(e, "deleteMessageController");
// 		return (reply.status(getErrorCode(e)).send({error:getErrorMessage(e)}));
// 	}
// }
