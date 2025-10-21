// src/plugins/services.ts
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { ChatService } from "../services/chats.service";
import { MessageService } from "../services/messages.service";


declare module "fastify" {
	interface FastifyInstance {
		services: {
			chat: ChatService;
			message: MessageService;
		}
	}
}

const servicesPlugin: FastifyPluginAsync = async (fastify) => {
	fastify.decorate("services", {
		chat: new ChatService(fastify.repositories.chats),
		message: new MessageService(fastify.repositories.messages)
	});
};

export default fp(servicesPlugin, {
	name: "services-plugin",
	dependencies: ["repositories-plugin"]
});
