import { SocketStream } from '@fastify/websocket';
import { GameParticipant, GameType } from '../schemas';
import { Team, PlayerSlot, GameMessage } from '../types'
import { GameConf, GameEngine, GameState } from './GameEngine';
import { FastifyBaseLogger } from 'fastify';
import { CONFIG } from '../config';
import { DbPlayerSession, DbSession } from '../db/repositories/SessionRepository';
import { toSqlDate } from '../db/utils';

interface Player {
    player_id: number;
    match_ticket: string;
    slot: PlayerSlot; // assigned by matchmaking or default order
    team: Team;

    socket?: SocketStream;
}

type PlayerMap = Map<string, Player>;

export type SessionPlayerMap = PlayerMap;

export class GameSession {
    private tournament_id: number | undefined;
    private type: GameType;
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

    constructor(game_type: GameType, participants: GameParticipant[], logger: FastifyBaseLogger) {
        this.type = game_type;
        this.players = this.loadPlayers_(participants);
        this.viewers = new Set<SocketStream>();
        this.created_at = new Date();
        this.last_activity = Date.now();
        this.game_engine = new GameEngine(game_type, this.players);
        this.logger = logger;
    }

    private loadPlayers_(participants: GameParticipant[]): PlayerMap {
        const game_type = this.type;
        const players: PlayerMap = new Map;

        participants.forEach((p, idx) => {
            if (game_type === 'multi')
                throw new Error("Multiplayer not implemented yet");
            
            const slot: PlayerSlot = idx === 0 ? "left" : "right";
            const team: Team = idx === 0 ? "left" : "right";

            players.set(p.match_ticket, {
                player_id: p.player_id,
                match_ticket: p.match_ticket,
                slot: slot,
                team: team,
                socket: undefined
            });
        });
        return players;
    }

    public get config(): GameConf {
        return this.game_engine.getConf(this.type);
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
    
    public connectPlayer(ticket: string, connection: SocketStream): void {
        if (this.viewers.has(connection)) {
            connection.socket.close(4001, "viewer cannot become a player");
            return;
        }

        const player = this.players.get(ticket);

        this.logger.info(`Player connecting with ticket: ${ticket}`);
        this.logger.info(`found player : ${player !== undefined}`);

        if (!player) {
            connection.socket.close(4001, "Invalid ticket");
            return;
        }
        if (player.socket) {
            connection.socket.close(4002, "duplicate ticket");
            return;
        }

        player.socket = connection;
        this.game_engine.setConnected(player.slot, true);
        connection.socket.on("close", () => {
            this.disconnectPlayer(ticket);
            this.last_activity = Date.now();
        });
    }

    public connectViewer(connection: SocketStream): void {
        if (this.viewers.has(connection)) {
            connection.socket.close(4001, "viewer can connect only once on the same websocket");
            return ;
        }
        this.viewers.add(connection);
        connection.socket.on("close", () => {
            this.disconnectViewer(connection);
            this.last_activity = Date.now();
        });
    }

    public disconnectPlayer(ticket: string): void {
        const player = this.players.get(ticket);
        if (!player) return; // TODO - or throw an exception
        player.socket = undefined;
        this.game_engine.setConnected(player.slot, false);
    }
   
    public disconnectViewer(connection: SocketStream): void {
        this.viewers.delete(connection);
    }

    public setupPlayerListeners(raw: string, connection: SocketStream): void {
        const msg = JSON.parse(raw);

        if (msg.type === "join") {
            this.connectPlayer(msg.ticket, connection);
        } else if (msg.type === "input") {
            if (this.viewers.has(connection)) {
                connection.socket.close(4001, "viewer cannot send input");
                return;
            }
            const player = this.players.get(msg.ticket);
            if (!player) {
                connection.socket.close(4001, "Invalid ticket");
                return;
            }                
            this.game_engine.applyMovement(player.slot, msg.move);
        } else {
            connection.socket.close(4000, "Invalid message type");
        }
    }

    public closeAllConnections(status: number, reason: string): void {
        this.players.forEach(({ socket: connection }, ticket) => {
            if (connection) {
                connection.socket.close(status, reason);
                this.disconnectPlayer(ticket);
            }
        });
        this.viewers.forEach( connection => {
            connection.socket.close(status, reason);
            this.disconnectViewer(connection);
        });
    }

    public toDbRecord(): DbSession | undefined {
        const game_state = this.game_engine.state;
        if (!this.started_at || !this.ended_at || !game_state.winner)
            return undefined;
        return {
            session: {
                type: this.type,
                tournament_id: this.tournament_id,
                created_at: toSqlDate(this.created_at),
                started_at: toSqlDate(this.started_at),
                ended_at: toSqlDate(this.ended_at),
            },
            player_sessions: Array.from(this.players.values()).map((p) => {
                const player_session: DbPlayerSession = {
                    user_id: p.player_id,
                    team: p.team,
                    slot: p.slot,
                    score: game_state.score[p.team],
                    winner: game_state.winner === p.team
                };
                return player_session;
            })
        };
    }

}