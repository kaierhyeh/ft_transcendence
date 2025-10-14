import { SocketStream } from '@fastify/websocket';
import { GameParticipant, GameMode, GameFormat, GameCreationData } from '../schemas';
import { Team, GameMessage } from '../types'
import { GameConf, GameEngine, GameState } from './GameEngine';
import { FastifyBaseLogger } from 'fastify';
import { CONFIG } from '../config';
import { DbPlayerSession, DbSession } from '../repositories/SessionRepository';
import { toSqlDate } from '../utils/db';

type Player = GameParticipant & {
    socket?: SocketStream;
}

type PlayerMap = Map<number, Player>;

export type SessionPlayerMap = PlayerMap;

export class GameSession {
    private game_format: GameFormat;
    private tournament_id: number | undefined;
    private game_mode: GameMode;
    private players: PlayerMap;
    private viewers: Set<SocketStream>;
    private game_engine: GameEngine;
    private last_activity: number;
    private created_at: Date;
    private last_time: number | undefined;
    private started_at: Date | undefined;
    private ended_at: Date | undefined;
    private winner: Team | undefined;
    private logger: FastifyBaseLogger;

    constructor(data: GameCreationData, logger: FastifyBaseLogger) {
        this.game_format = data.format;
        this.game_mode = data.mode;
        this.tournament_id = data.tournament_id;
        this.players = this.initPlayers_(data.participants);
        this.viewers = new Set<SocketStream>();
        this.created_at = new Date();
        this.last_activity = Date.now();
        this.game_engine = new GameEngine(this.game_format, this.players);
        this.logger = logger;
    }

    private initPlayers_(participants: GameParticipant[]): PlayerMap {
        const players: PlayerMap = new Map();
        participants.forEach((p, idx) => {
            players.set(p.player_id, {
                player_id: p.player_id,
                type: p.type,
                team: p.team,
                slot: p.slot,
                user_id: p.user_id,
                username: p.username,
                socket: undefined,
            });
        });
        return players;
    }

    public get config(): GameConf {
        return this.game_engine.conf;
    }

    public get started(): boolean {
        return this.started_at !== undefined;
    }

    public get over(): boolean {
        if (this.winner) {
            this.ended_at = new Date();
            this.logger.info(`Checking if game is over. Winner: ${this.winner}, Ended at: ${this.ended_at}`);
            return true;
        }
        return false;
    }

    public checkAndStart(): void {
        const started = Array.from(this.players.values()).every((p) => p.socket !== undefined);
        if (started && this.started_at === undefined) {
            this.started_at = new Date();
            this.last_time = Date.now();
        }
    }

    public get timeout(): boolean {
        const no_connection: boolean = Array.from(this.players.values()).every((p) => p.socket === undefined);
        return no_connection && ( Date.now() - this.last_activity > CONFIG.GAME.SESSION_TIMEOUT);
    }

    private get delta(): number | undefined {
        return this.last_time ? Date.now() - this.last_time : undefined;
    }

    public tick(): void {
        const delta = this.delta;
        if (delta) {
            this.game_engine.update(delta);
            this.winner = this.game_engine.winner;
            this.last_time = Date.now();
        }
    }

    public broadcastState(): void {
        const state: GameState = this.game_engine.state;
        const message: GameMessage = {type: "game_state", data: state};
        this.broadcast(message);
    }

    public broadcast(message: GameMessage): void {
        const payload = JSON.stringify(message);

        this.players.forEach(({ socket: connection }) => {
            if (connection) connection.socket.send(payload);
        });
        this.viewers.forEach( connection => {
            connection.socket.send(payload);
        });
    }
    
    public connectPlayer(player_id: number, connection: SocketStream): void {
        const player = this.players.get(player_id);

        this.logger.info(`Player connecting with player_id: ${player_id}`);
        this.logger.info(`found player : ${player !== undefined}`);

        if (!player) {
            connection.socket.close(4001, "Invalid player_id");
            return;
        }

        player.socket = connection;
        this.game_engine.setConnected(player.slot, true);

        connection.socket.on("message", (raw: string) => {
            const msg = JSON.parse(raw);
            if (msg.type === "input") {          
                this.game_engine.applyMovement(player.slot, msg.move);
            } else {
                connection.socket.close(4000, "Invalid message type");
            }
        });

        connection.socket.on("close", () => {
            this.disconnectPlayer(player_id);
            this.last_activity = Date.now();
        });
    }

    public connectViewer(connection: SocketStream): void {
        this.viewers.add(connection);
        connection.socket.on("close", () => {
            this.disconnectViewer(connection);
            this.last_activity = Date.now();
        });
    }

    public disconnectPlayer(player_id: number): void {
        const player = this.players.get(player_id);
        if (!player) return; // TODO - or throw an exception
        player.socket = undefined;
        this.game_engine.setConnected(player.slot, false);
    }
   
    public disconnectViewer(connection: SocketStream): void {
        this.viewers.delete(connection);
    }

    public closeAllConnections(status: number, reason: string): void {
        this.players.forEach(({ socket: connection }, participant_id) => {
            if (connection) {
                connection.socket.close(status, reason);
                this.disconnectPlayer(participant_id);
            }
        });
        this.viewers.forEach( connection => {
            connection.socket.close(status, reason);
            this.disconnectViewer(connection);
        });
    }

    public toDbRecord(): DbSession | undefined {
        const game_state = this.game_engine.state;
        if (this.game_format === "2v2" || !this.started_at || !this.ended_at || !game_state.winner)
            return undefined;
        
        // Check if there's at least one registered (non-guest) user to view session history
        const hasRegisteredUser = Array.from(this.players.values()).some(p => p.type === "registered");
        
        if (!hasRegisteredUser) {
            return undefined;
        }
        
        // Include all players (including AI and guests) in the stored session
        const players = Array.from(this.players.values());
        
        return {
            session: {
                format: this.game_format,
                mode: this.game_mode,
                tournament_id: this.tournament_id ?? null,
                created_at: toSqlDate(this.created_at),
                started_at: toSqlDate(this.started_at),
                ended_at: toSqlDate(this.ended_at),
            },
            player_sessions: players.map((p) => {

                const player_session: DbPlayerSession = {
                    user_id: p.user_id ?? null,
                    username: p.username ?? null,
                    type: p.type,
                    team: p.team,
                    score: game_state.score[p.team],
                    winner: game_state.winner === p.team
                };
                return player_session;
            })
        };
    }

}