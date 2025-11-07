import { GameParticipant, MatchmakingFormat, MatchmakingResponse } from '../schemas/index.js';
import { LiveSessionManager } from './LiveSessionManager.js';
import type { WebSocket } from "ws";

interface QueueEntry {
  participant: GameParticipant;
}

export class MatchmakingManager {
  queues: Map<MatchmakingFormat, QueueEntry[]>;
  sessionManager: LiveSessionManager;
  waitingConnections: Map<string, WebSocket>;

  constructor(sessionManager: LiveSessionManager) {
    this.queues = new Map();
    this.queues.set("1v1", []);
    this.queues.set("2v2", []);
    this.sessionManager = sessionManager;
    this.waitingConnections = new Map();
  }

  async joinQueue(participant: GameParticipant, format: MatchmakingFormat): Promise<MatchmakingResponse> {
      if (participant.type === 'ai') {
        const error = new Error;
        (error as any).code = "INVALID_PARTICIPANT";
        error.message = 'AI players cannot join matchmaking queues';
        throw error;
    }
    
    if (this.isPlayerAlreadyInQueue(participant.participant_id)) {
      const error = new Error;
      (error as any).code = "INVALID_PARTICIPANT";
      error.message = 'Already in queue';
      throw error;
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
      const response = await this.createGameFromQueue(format);
      const gameId = response.game_id;
      if (!gameId)
        throw new Error ('Failed to create game from queue');
      const player = this.sessionManager.getPlayers(gameId)?.get(participant.participant_id);
      if (!player)
        throw new Error ('Failed to get player info from created game');
      return {
        ...response,
        team: player.team,
        slot: player.slot
      };
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

    const players = this.sessionManager.getPlayers(gameId);
    if (!players) {
      const error = new Error;
      error.message = 'Failed to retrieve players for created game';
      throw error;
    }

    for (let i = 0; i < participants.length; i++) {
      const participantId = participants[i].participant_id;
      const ws = this.waitingConnections.get(participantId);
      const player = players.get(participantId);
      if (ws && player) {
        const message = {
          type: "game_ready",
          game_id: gameId,
          team: player.team,
          slot: player.slot
        };
        const jsonMessage = JSON.stringify(message);
        ws.send(jsonMessage);
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
  
  saveWebSocket(participantId: string, ws: WebSocket): void {
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