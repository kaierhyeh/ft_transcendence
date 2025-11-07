import Fastify from "fastify";
import { CONFIG } from "./config";
import routes from "./routes"
import repositoriesPlugin from "./plugins/repositories";
import servicesPlugin from "./plugins/services";
import multipart from "@fastify/multipart";
import fs from "fs";
import path from "path";
import cookie from "@fastify/cookie";

const fastify = Fastify({ logger: true });

async function run() {
  await fastify.register(multipart, {
    limits: {
      fileSize: CONFIG.AVATAR.MAX_SIZE,
      files: 1
    }
  });
  
  await fastify.register(cookie);
  await fastify.register(repositoriesPlugin);
  await fastify.register(servicesPlugin);

  // Validate default avatar exists at startup
  const defaultAvatarPath = path.join(CONFIG.AVATAR.BASE_URL, CONFIG.AVATAR.DEFAULT_FILENAME);
  if (!fs.existsSync(defaultAvatarPath)) {
    fastify.log.error(`❌ Default avatar missing at: ${defaultAvatarPath}`);
    process.exit(1);
  }
  fastify.log.info(`✅ Default avatar found at: ${defaultAvatarPath}`);

  for (const { route, prefix } of routes) {
    await fastify.register(route, { prefix });
  }

  // Health check endpoint
	fastify.get('/health', async (request, reply) => {
		return { status: 'ok', service: 'auth', timestamp: new Date().toISOString() };
	});
  
  await fastify.listen({ 
    port: CONFIG.SERVER.PORT, 
    host: CONFIG.SERVER.HOST 
  });
}

run().catch(console.error);
