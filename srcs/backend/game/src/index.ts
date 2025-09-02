import Fastify from "fastify";
import routes from "./routes"; // array of route plugins
import websocketPlugin from '@fastify/websocket';
import liveSessionManagerPlugin from "./plugins/liveSessionManager";

const fastify = Fastify({ logger: true });

// register plugins
fastify.register(websocketPlugin);
fastify.register(liveSessionManagerPlugin);

// register all route files
for (const route of routes) {
  fastify.register(route, { prefix: "/game" });
}

// Live Games Update loop
setInterval(() => {
  fastify.sessions.update()
}, 16); // 60 fps

fastify.listen({ port: 3000, host: "0.0.0.0"});