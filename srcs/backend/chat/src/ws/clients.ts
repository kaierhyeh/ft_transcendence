import { dataDTO } from "../types/dto.type";

export const clients = new Map<number, WebSocket>();

export function sendMessageViaWebSocket(toId: number, data: dataDTO) {
	const client = clients.get(toId);
	if (!client) return;

	try {
		client.send(JSON.stringify(data));
	} catch {
		clients.delete(toId);
		console.error("Cant send msg");
	}
}
