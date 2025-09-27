// src/plugins/services.ts
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { UserService } from "../services/UserService";
import { BlockService } from "../services/BlockService";
import { FriendService } from "../services/FriendService";

declare module "fastify" {
  interface FastifyInstance {
    services: {
      user: UserService;
      friends: FriendService;
      blocks: BlockService;
    }
  }
}

const servicesPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("services", {
    user: new UserService(fastify.repositories.users),
    friends: new FriendService(fastify.repositories.friends),
    blocks: new BlockService(fastify.repositories.blocks, fastify.repositories.friends)
  });
};

export default fp(servicesPlugin, {
  name: "services-plugin",
  dependencies: ["repositories-plugin"]
});