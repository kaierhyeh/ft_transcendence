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
		
import { } from "../utils/errorHandler";

export async function sendMessagesController() {
	try {

	} catch (e: any) {

	}
}

export async function getMessagesController() {
	try {

	} catch (e: any) {

	}
}

export async function deleteMessageController() {
	try {

	} catch (e: any) {

	}
}
