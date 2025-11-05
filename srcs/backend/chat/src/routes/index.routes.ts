import chatsRoutes from "./chat.routes";
import messagesRoutes from "./message.routes";
import wsRoutes from "./ws.routes";

export default [
	{ route: chatsRoutes, prefix: "/chat" },
	{ route: messagesRoutes, prefix: "/message" },
	{ route: wsRoutes, prefix: "/chat_ws" },
];
