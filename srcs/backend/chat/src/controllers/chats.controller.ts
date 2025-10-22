import { FastifyRequest, FastifyReply } from "fastify";
import { ChatService } from "../services/chats.service";
import { UserIdParams } from "../schemas/users.schema";
import { ChatIdParams } from "../schemas/chats.schema";
import { toInteger } from "../utils/toInteger";

export class ChatController {
	constructor(private chatService: ChatService) {}

	public async getUserChats(request: FastifyRequest, reply: FastifyReply) {
		try {
			const sub = request.authUser?.sub;
			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const thisUserId = toInteger(sub);
			const chats = await this.chatService.getUserChats(thisUserId);
			reply.status(200).send(chats);
		} catch (error) {
			this.handleError(error, reply);
		}
	}
	
	public async getUserChat(request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) {
		try {
			
			const sub = request.authUser?.sub;
			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const thisUserId = toInteger(sub);
			const withUserId = request.params.id;
			const chatUser = await this.chatService.getUserChat(thisUserId, withUserId);
			reply.status(200).send(chatUser);
		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async getChatById(request: FastifyRequest<{ Params: ChatIdParams }>, reply: FastifyReply) {
		try {
			const chatId = request.params.id;
			const sub = request.authUser?.sub;

			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const thisUserId = toInteger(sub);
			const chat = await this.chatService.getChatById(chatId, thisUserId);
			reply.status(200).send(chat);
		} catch (error) {
			this.handleError(error, reply);
		}
	}

	private handleError(error: any, reply: FastifyReply) {
		if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
			reply.status(409).send({
				error: "Username or email already exists"
			});
		} else if (error.code === 'USER_NOT_FOUND') {
			reply.status(404).send({
				error: "User not found"
			});
		} else {
			reply.log.error(error);
			reply.status(500).send({
				error: "Internal server error"
			});
		}
	}
}
