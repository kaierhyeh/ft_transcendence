import { FastifyRequest, FastifyReply } from "fastify";
import { MessageService } from "../services/messages.service";
import { toInteger } from "../utils/toInteger";
import { GameInfoParams, NewMessageBody } from "../schemas/messages.schema";

export class MessageController {

	constructor(private messageService: MessageService) {}

	private chatClientsWebSocket = new Map<number, WebSocket>();

	public registerChatClient(clientId: number, socket: WebSocket) {
		this.chatClientsWebSocket.set(clientId, socket);
	}

	public unregisterChatClient(clientId: number) {
		this.chatClientsWebSocket.delete(clientId);
	}

	public async addMessage(request: FastifyRequest<{ Body: NewMessageBody }>, reply: FastifyReply) {
		try {
			const sub = request.authUser?.sub;
			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const chatId = request.body.chatId;
			const fromId = toInteger(sub);
			const toId = request.body.toId
			const fromUsername = request.body.fromUsername;
			const msg = request.body.msg;

			await this.messageService.sendMessage(chatId, fromId, toId, fromUsername ? fromUsername : "incognito", msg);

			reply.status(200).send({
				success: true,
				message: "Message was sent"
			});

		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async notifyAboutGame(request: FastifyRequest<{ Body: GameInfoParams }>, reply: FastifyReply) {
		try {
			const { fromId, toId, gameId } = request.body;
			await this.messageService.notifyAboutGame(fromId, toId, gameId);
			reply.status(200).send({ message: "Users was noticed" });
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