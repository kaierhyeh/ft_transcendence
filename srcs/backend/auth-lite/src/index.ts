import Fastify from "fastify";
import { CONFIG } from "./config";
import authRoutes from "./routes"
import fastifyJwt from "@fastify/jwt";
import fs from 'fs';

const fastify = Fastify({ logger: true });

// Load game keys for game JWT generation
const gamePrivateKey = fs.readFileSync(CONFIG.JWT.GAME_PRIVATE_KEY_PATH, 'utf8');
const gamePublicKey = fs.readFileSync(CONFIG.JWT.GAME_PUBLIC_KEY_PATH, 'utf8');

// Extend Fastify instance with game keys
declare module "fastify" {
  interface FastifyInstance {
    gameKeys: {
      private: string;
      public: string;
    };
  }
}

async function run() {
  
  // Decorate fastify with game keys
  fastify.decorate('gameKeys', {
    private: gamePrivateKey,
    public: gamePublicKey
  });
  
  await fastify.register(authRoutes, {prefix: "/auth-lite"} );
  
  // Regular JWT configuration for user authentication
  await fastify.register(fastifyJwt, {
    secret: {
      private: fs.readFileSync(CONFIG.JWT.PRIVATE_KEY_PATH, 'utf8'),
      public: fs.readFileSync(CONFIG.JWT.PUBLIC_KEY_PATH, 'utf8')
    }
  });
  
  await fastify.listen({ 
    port: CONFIG.SERVER.PORT, 
    host: CONFIG.SERVER.HOST 
  });
}

run().catch(console.error);
