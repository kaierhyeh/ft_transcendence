import Fastify from "fastify";
import websocketPlugin from '@fastify/websocket';
import liveSessionManagerPlugin from "./plugins/liveSessionManager";
import routes from "./routes";

const fastify = Fastify({ logger: true });

fastify.register(websocketPlugin);
fastify.register(liveSessionManagerPlugin);

for (const route of routes) {
  fastify.register(route, { prefix: "/game" });
}

setInterval(() => {
  fastify.sessions.update()
}, 16); // 60 fps

fastify.listen({ port: 3000, host: "0.0.0.0" });