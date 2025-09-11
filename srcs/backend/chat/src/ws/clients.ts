import { dataDTO } from "../types/dto.type";
import { redLogError } from "../utils/logger";

export const clients = new Map<number, WebSocket>();

export function sendMessageViaWebSocket(toId: number, data: dataDTO) {
	const client = clients.get(toId);
	if (!client) return;

	try {
		client.send(JSON.stringify(data));
	} catch {
		clients.delete(toId);
		redLogError("Cant send msg");
	}
}
