// init fastify, add plugins

import Fastify, { FastifyInstance } from 'fastify';
import { logger } from './utils/logger';
import { routes } from './routes/routes';

export const app: FastifyInstance = Fastify({
	logger: true
});

// Register plugins
app.register(logger);

// Register routes
app.register(routes);


// import Fastify from "fastify";
// import websocketPlugin from '@fastify/websocket';
// import corsPlugin from '@fastify/cors';
// import liveSessionManagerPlugin from "./plugins/liveSessionManager";
// import dbPlugin from "./plugins/db";
// import routes from "./routes";
// import { CONFIG } from "./config";

// const fastify = Fastify({ logger: true });

// async function run() {
//   // Register CORS first
//   await fastify.register(corsPlugin, {
//     origin: true, // Allow all origins
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"]
//   });
  
//   await fastify.register(websocketPlugin);
//   await fastify.register(dbPlugin);
//   await fastify.register(liveSessionManagerPlugin);
  
//   for (const route of routes) {
//     await fastify.register(route, { prefix: "/game" });
//   }
  
//   // Use config for update period
//   setInterval(() => {
//     fastify.sessions.update();
//   }, CONFIG.GAME.TICK_PERIOD);
  
//   await fastify.listen({ 
//     port: CONFIG.SERVER.PORT, 
//     host: CONFIG.SERVER.HOST 
//   });
// }

// run().catch(console.error);