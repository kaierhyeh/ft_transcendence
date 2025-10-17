import { GameParticipant, MatchmakingFormat, MatchmakingResponse } from '../schemas/index.js';
import { LiveSessionManager } from './LiveSessionManager.js';
import { SocketStream } from "@fastify/websocket";

interface QueueEntry {
  participant: GameParticipant;
}

export class MatchmakingManager {
  queues: Map<MatchmakingFormat, QueueEntry[]>;
  sessionManager: LiveSessionManager;
  waitingConnections: Map<string, SocketStream>;

  constructor(sessionManager: LiveSessionManager) {
    this.queues = new Map();
    this.queues.set("1v1", []);
    this.queues.set("2v2", []);
    this.sessionManager = sessionManager;
    this.waitingConnections = new Map();
  }

  async joinQueue(participant: GameParticipant, format: MatchmakingFormat): Promise<MatchmakingResponse> {
    if (this.isPlayerAlreadyInQueue(participant.participant_id)) {
      return {
        type: "error",
        message: "Already in queue"
      };
    }

    const queue = this.queues.get(format)!;
    const entry: QueueEntry = {
      participant
    };
    
    queue.push(entry);

    let playersNeeded = 2;
    if (format == "2v2") {
      playersNeeded = 4;
    }
    
    if (queue.length >= playersNeeded) {
      return await this.createGameFromQueue(format);
    }

    return {
      type: "queue_joined",
      format,
      position: queue.length,
      players_needed: playersNeeded - queue.length
    };
  }

  async createGameFromQueue(format: MatchmakingFormat): Promise<MatchmakingResponse> {
    const queue = this.queues.get(format)!;
    
    let playersNeeded = 2;
    if (format == "2v2") {
      playersNeeded = 4;
    }
    
    const selectedEntries = queue.splice(0, playersNeeded);
    const participants: GameParticipant[] = [];

    for (let i = 0; i < selectedEntries.length; i++) {
      const entry = selectedEntries[i];
      participants.push(entry.participant);
    }
    
 let gameType: "pvp" | "multi" = "pvp";
if (format == "2v2") {
  gameType = "multi";
}

const gameId = await this.sessionManager.createGameSession({
  format,
  mode: 'pvp',
  online: true,
  participants
});
 
    for (let i = 0; i < participants.length; i++) {
      const participantId = participants[i].participant_id;
      const ws = this.waitingConnections.get(participantId);
      if (ws) {
        const message = {
          type: "game_ready",
          game_id: gameId
        };
        const jsonMessage = JSON.stringify(message);
        ws.socket.send(jsonMessage);
        this.waitingConnections.delete(participantId);
      }
    }
    
    return {
      type: "game_ready",
      format,
      game_id: gameId
    };
  }

  public isPlayerAlreadyInQueue(participantId: string): boolean {
    const queue1v1 = this.queues.get("1v1")!;
    for (let i = 0; i < queue1v1.length; i++) {
      const entry = queue1v1[i];
      if (entry.participant.participant_id == participantId) {
        return true;
      }
    }
    
    const queue2v2 = this.queues.get("2v2")!;
    for (let i = 0; i < queue2v2.length; i++) {
      const entry = queue2v2[i];
      if (entry.participant.participant_id == participantId) {
        return true;
      }
    }
    
    return false;
  }
  
  getQueueStatus(format: MatchmakingFormat): MatchmakingResponse {
    const queue = this.queues.get(format)!;
    
    let playersNeeded = 2;
    if (format == "2v2") {
      playersNeeded = 4;
    }
    
    return {
      type: "queue_status",
      format,
      position: queue.length,
      players_needed: Math.max(0, playersNeeded - queue.length)
    };
  }
  
  saveWebSocket(participantId: string, ws: SocketStream): void {
    this.waitingConnections.set(participantId, ws);
  }
  
  removeWebSocket(participantId: string): void {
    this.waitingConnections.delete(participantId);
    
    const queue1v1 = this.queues.get("1v1")!;
    for (let i = 0; i < queue1v1.length; i++) {
      if (queue1v1[i].participant.participant_id == participantId) {
        queue1v1.splice(i, 1);
        break;
      }
    }
    
    const queue2v2 = this.queues.get("2v2")!;
    for (let i = 0; i < queue2v2.length; i++) {
      if (queue2v2[i].participant.participant_id == participantId) {
        queue2v2.splice(i, 1);
        break;
      }
    }
  }
}