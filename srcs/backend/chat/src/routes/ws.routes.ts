// import { FastifyInstance, FastifyRequest } from "fastify";
// import { postMessageController } from "../controllers/messages.controller";
// import { dataDTO, jwtDTO } from "../types/dto.type";
// import { sendMessageViaWebSocket, clients } from "../ws/clients";
// import { colorLog } from "../utils/logger";

// // routes, controller, service - all in one place
// export async function wsRoutes(fastify: FastifyInstance) {
// 	fastify.get("/ws", { websocket: true }, async (inConnection: any, req: FastifyRequest<{ Querystring: { token: string } }>) => {
// 			const tok = req.query.token;

// 			// token check
// 			if (!tok) {
// 				inConnection.socket.close(4001, "Token required");
// 				return;
// 			}
// 			let jwtData: jwtDTO;
// 			try {
// 				jwtData = fastify.jwt.verify(tok) as jwtDTO;
// 			} catch {
// 				inConnection.socket.close(4002, "Invalid token");
// 				return;
// 			}
// 			const userId = jwtData.userId;
// 			if (!userId) {
// 				inConnection.socket.close(4003, "User ID missing in token");
// 				return;
// 			}

// 			// save connection
// 			clients.set(userId, inConnection);
// 			colorLog("cyan", "Connected via WebSocket userId=", userId);

// 			// handle message
// 			inConnection.on("message", async (msg: string) => {
// 				let data;
// 				try {
// 					data = JSON.parse(msg);
// 				} catch {
// 					return;
// 				}

// 				if (data.type === "ping") {
// 					inConnection.send(JSON.stringify({ type: "pong" }));
// 					return;
// 				}

// 				if (data.type === "chat_send_message") {
// 					await postMessageController(data.payload.fromId, data.payload.toId, data.payload.msg);

// 					const dataToSend: dataDTO = {
// 						type: "chat_incomming_message",
// 						payload: {
// 							fromId: data.payload.fromId,
// 							toId: data.payload.toId,
// 							msg: data.payload.msg,
// 						},
// 					};

// 					sendMessageViaWebSocket(data.payload.fromId, dataToSend);
// 					return;
// 				}

// 				colorLog("yellow", "No rules to handle type=", data.type);
// 			});

// 			// if close
// 			inConnection.on("close", () => {
// 				clients.delete(userId);
// 			});

// 			// if error
// 			inConnection.on("error", () => {
// 				clients.delete(userId);
// 			});
// 		}
// 	);
// }
