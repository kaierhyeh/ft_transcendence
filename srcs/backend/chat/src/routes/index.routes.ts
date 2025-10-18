import chatsRoutes from "./chat.routes";
import messagesRoutes from "./message.routes";

export default [
	{ route: chatsRoutes, prefix: "/chat" },
	{ route: messagesRoutes, prefix: "/message" },
];
