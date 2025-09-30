import Fastify from "fastify";
import { CONFIG } from "./config";
import routes from "./routes"
import repositoriesPlugin from "./plugins/repositories";
import servicesPlugin from "./plugins/services";
import multipart from "@fastify/multipart";
import fs from "fs";
import path from "path";
import { InternalAuthClient } from "./clients/internal-auth.client";


const fastify = Fastify({ logger: true });

async function run() {
  await fastify.register(multipart, {
    limits: {
      fileSize: CONFIG.AVATAR.MAX_SIZE,
      files: 1
    }
  });
  
  await fastify.register(repositoriesPlugin);
  await fastify.register(servicesPlugin);

  // Validate default avatar exists at startup
  const defaultAvatarPath = path.join(CONFIG.AVATAR.BASE_URL, CONFIG.AVATAR.DEFAULT_FILENAME);
  if (!fs.existsSync(defaultAvatarPath)) {
    fastify.log.error(`❌ Default avatar missing at: ${defaultAvatarPath}`);
    process.exit(1);
  }
  fastify.log.info(`✅ Default avatar found at: ${defaultAvatarPath}`);

  // Initialize internal auth client (fetch first token)
  const internalAuthClient = new InternalAuthClient();
  try {
    await internalAuthClient.getToken();
    fastify.log.info('✅ Internal auth client initialized');
  } catch (error) {
    fastify.log.error(`❌ Failed to initialize internal auth client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }

  for (const { route, prefix } of routes) {
    await fastify.register(route, { prefix });
  }
  
  await fastify.listen({ 
    port: CONFIG.SERVER.PORT, 
    host: CONFIG.SERVER.HOST 
  });
}

run().catch(console.error);
