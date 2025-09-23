import { GameParticipant, MatchmakingMode, MatchmakingResponse } from '../schemas/index.js';
import { LiveSessionManager } from './LiveSessionManager.js';

interface QueueEntry {
  participant: GameParticipant;
  joined_at: Date;
}

export class MatchmakingManager {
  private queues: Map<MatchmakingMode, QueueEntry[]>;
  private sessionManager: LiveSessionManager;

  constructor(sessionManager: LiveSessionManager) {
    this.queues = new Map();
    this.queues.set("2p", []);
    this.queues.set("4p", []);
    this.sessionManager = sessionManager;
  }

  async joinQueue(participant: GameParticipant, mode: MatchmakingMode): Promise<MatchmakingResponse> {
    if (this.isPlayerAlreadyInQueue(participant.participant_id)) {
      return {
        type: "error",
        message: "Already in queue"
      };
    }

    const queue = this.queues.get(mode)!;
    const entry: QueueEntry = {
      participant,
      joined_at: new Date()
    };
    
    queue.push(entry);

    const playersNeeded = mode === "2p" ? 2 : 4;
    
    if (queue.length >= playersNeeded) {
      return await this.createGameFromQueue(mode);
    }

    return {
      type: "queue_joined",
      mode,
      position: queue.length,
      players_needed: playersNeeded - queue.length
    };
  }

  private async createGameFromQueue(mode: MatchmakingMode): Promise<MatchmakingResponse> {
    const queue = this.queues.get(mode)!;
    const playersNeeded = mode === "2p" ? 2 : 4;
    const selectedEntries = queue.splice(0, playersNeeded);
    const participants: GameParticipant[] = [];

    for (let i = 0; i < selectedEntries.length; i++) {
      const entry = selectedEntries[i];
      participants.push(entry.participant);
    }
    
    const gameType = mode === "2p" ? "pvp" : "multi";
    const gameId = await this.sessionManager.createGameSession(gameType, participants);
    
    return {
      type: "game_ready",
      mode,
      game_id: gameId
    };
  }

  private isPlayerAlreadyInQueue(participantId: string): boolean {
    const queue2p = this.queues.get("2p")!;
    for (let i = 0; i < queue2p.length; i++) {
      const entry = queue2p[i];
      if (entry.participant.participant_id === participantId) {
        return true;
      }
    }
    const queue4p = this.queues.get("4p")!;
    for (let i = 0; i < queue4p.length; i++) {
      const entry = queue4p[i];
      if (entry.participant.participant_id === participantId) {
        return true;
      }
    }
    return false;
  }

  removePlayerFromQueues(participantId: string): void {
    const queue2p = this.queues.get("2p")!;
    for (let i = 0; i < queue2p.length; i++) {
      const entry = queue2p[i];
      if (entry.participant.participant_id === participantId) {
        queue2p.splice(i, 1);
        return;
      }
    }

    const queue4p = this.queues.get("4p")!;
    for (let i = 0; i < queue4p.length; i++) {
      const entry = queue4p[i];
      if (entry.participant.participant_id === participantId) {
        queue4p.splice(i, 1);
        return;
      }
    }
  }

  getQueueStatus(mode: MatchmakingMode): MatchmakingResponse {
    const queue = this.queues.get(mode)!;
    const playersNeeded = mode === "2p" ? 2 : 4;
    
    return {
      type: "queue_status",
      mode,
      position: queue.length,
      players_needed: Math.max(0, playersNeeded - queue.length)
    };
  }
}