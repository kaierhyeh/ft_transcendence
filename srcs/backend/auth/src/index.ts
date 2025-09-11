import Fastify from "fastify";
import { CONFIG } from "./config";
import authRoutes from "./routes"
import fastifyJwt from "@fastify/jwt";
import fs from 'fs';

const fastify = Fastify({ logger: true });

async function run() {
  
  await fastify.register(authRoutes, {prefix: "/auth"} );
  
  await fastify.register(fastifyJwt, {
    secret: {
      private: fs.readFileSync(CONFIG.JWT.PRIVATE_KEY_PATH, 'utf8'),
      public: fs.readFileSync(CONFIG.JWT.PUBLIC_KEY_PATH, 'utf8')
    },
    sign: {
      algorithm: CONFIG.JWT.ALGORITHM,
      expiresIn: CONFIG.JWT.EXPIRES_IN,
    },
    verify: {
      algorithms: [CONFIG.JWT.ALGORITHM]
    }
  });
  
  await fastify.listen({ 
    port: CONFIG.SERVER.PORT, 
    host: CONFIG.SERVER.HOST 
  });
}

run().catch(console.error);
