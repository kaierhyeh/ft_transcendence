import { GameParticipant, MatchmakingMode, MatchmakingResponse } from '../schemas/index.js';
import { LiveSessionManager } from './LiveSessionManager.js';
import { SocketStream } from "@fastify/websocket";

interface QueueEntry {
  participant: GameParticipant;
}

export class MatchmakingManager {
  queues: Map<MatchmakingMode, QueueEntry[]>;
  sessionManager: LiveSessionManager;
  waitingConnections: Map<string, SocketStream>;

  constructor(sessionManager: LiveSessionManager) {
    this.queues = new Map();
    this.queues.set("2p", []);
    this.queues.set("4p", []);
    this.sessionManager = sessionManager;
    this.waitingConnections = new Map();
  }

  joinQueue(participant: GameParticipant, mode: MatchmakingMode): MatchmakingResponse {
    if (this.isPlayerAlreadyInQueue(participant.participant_id)) {
      return {
        type: "error",
        message: "Already in queue"
      };
    }

    const queue = this.queues.get(mode)!;
    const entry: QueueEntry = {
      participant
    };
    
    queue.push(entry);

    let playersNeeded = 2;
    if (mode == "4p") {
      playersNeeded = 4;
    }
    
    if (queue.length >= playersNeeded) {
      return this.createGameFromQueue(mode);
    }

    return {
      type: "queue_joined",
      mode,
      position: queue.length,
      players_needed: playersNeeded - queue.length
    };
  }

  createGameFromQueue(mode: MatchmakingMode): MatchmakingResponse {
    const queue = this.queues.get(mode)!;
    
    let playersNeeded = 2;
    if (mode == "4p") {
      playersNeeded = 4;
    }
    
    const selectedEntries = queue.splice(0, playersNeeded);
    const participants: GameParticipant[] = [];

    for (let i = 0; i < selectedEntries.length; i++) {
      const entry = selectedEntries[i];
      participants.push(entry.participant);
    }
    
 let gameType: "pvp" | "multi" = "pvp";
if (mode == "4p") {
  gameType = "multi";
}

const gameId = this.sessionManager.createGameSession(gameType, participants);
 
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
      mode,
      game_id: gameId
    };
  }

  public isPlayerAlreadyInQueue(participantId: string): boolean {
    const queue2p = this.queues.get("2p")!;
    for (let i = 0; i < queue2p.length; i++) {
      const entry = queue2p[i];
      if (entry.participant.participant_id == participantId) {
        return true;
      }
    }
    
    const queue4p = this.queues.get("4p")!;
    for (let i = 0; i < queue4p.length; i++) {
      const entry = queue4p[i];
      if (entry.participant.participant_id == participantId) {
        return true;
      }
    }
    
    return false;
  }
  
  getQueueStatus(mode: MatchmakingMode): MatchmakingResponse {
    const queue = this.queues.get(mode)!;
    
    let playersNeeded = 2;
    if (mode == "4p") {
      playersNeeded = 4;
    }
    
    return {
      type: "queue_status",
      mode,
      position: queue.length,
      players_needed: Math.max(0, playersNeeded - queue.length)
    };
  }
  
  saveWebSocket(participantId: string, ws: SocketStream): void {
    this.waitingConnections.set(participantId, ws);
  }
  
  removeWebSocket(participantId: string): void {
    this.waitingConnections.delete(participantId);
    
    const queue2p = this.queues.get("2p")!;
    for (let i = 0; i < queue2p.length; i++) {
      if (queue2p[i].participant.participant_id == participantId) {
        queue2p.splice(i, 1);
        break;
      }
    }
    
    const queue4p = this.queues.get("4p")!;
    for (let i = 0; i < queue4p.length; i++) {
      if (queue4p[i].participant.participant_id == participantId) {
        queue4p.splice(i, 1);
        break;
      }
    }
  }
}