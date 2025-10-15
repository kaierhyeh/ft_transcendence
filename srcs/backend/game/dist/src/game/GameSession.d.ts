import { SocketStream } from '@fastify/websocket';
import { GameParticipant, GameType } from '../schemas';
import { Team, PlayerSlot, GameMessage } from '../types';
import { GameConf } from './GameEngine';
import { FastifyBaseLogger } from 'fastify';
import { DbSession } from '../db/repositories/SessionRepository';
interface Player {
    user_id: number;
    participant_id: string;
    slot: PlayerSlot;
    team: Team;
    is_ai: boolean;
    socket?: SocketStream;
}
type PlayerMap = Map<string, Player>;
export type SessionPlayerMap = PlayerMap;
export declare class GameSession {
    private tournament_id;
    private type;
    private game_mode;
    private players;
    private viewers;
    private game_engine;
    private last_activity;
    private created_at;
    private last_time;
    private started_at;
    private ended_at;
    private winner;
    private logger;
    constructor(game_type: GameType, participants: GameParticipant[], logger: FastifyBaseLogger);
    private loadPlayers_;
    get config(): GameConf;
    get started(): boolean;
    get over(): boolean;
    checkAndStart(): void;
    get timeout(): boolean;
    private get delta();
    tick(): void;
    broadcastState(): void;
    broadcast(message: GameMessage): void;
    connectPlayer(participant_id: string, connection: SocketStream): void;
    connectViewer(connection: SocketStream): void;
    disconnectPlayer(participant_id: string): void;
    disconnectViewer(connection: SocketStream): void;
    setupPlayerListeners(raw: string, connection: SocketStream): void;
    closeAllConnections(status: number, reason: string): void;
    toDbRecord(): DbSession | undefined;
}
export {};
//# sourceMappingURL=GameSession.d.ts.map