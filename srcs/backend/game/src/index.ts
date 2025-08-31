import { createServer } from "./server/server";
const server = createServer();
server.listen({ port: 3000, host: '0.0.0.0' });