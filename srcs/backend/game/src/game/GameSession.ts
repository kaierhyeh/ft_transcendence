import { SocketStream } from '@fastify/websocket';
import { GameParticipant, GameType } from '../schemas';
import { Team, PlayerSlot, GameMessage } from '../types'
import { GameConf, GameEngine, GameState } from './GameEngine';
import { FastifyBaseLogger } from 'fastify';

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

            players.set(slot, {
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
        return no_connection && ( Date.now() - this.last_activity > 5000);
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
    

    public connectPlayer(ticket: string, connection: SocketStream): boolean {
        const player = this.players.get(ticket);

        this.logger.info(`Player connecting with ticket: ${ticket}`);

        if (!player || player.socket ) return false;

        player.socket = connection;
        this.game_engine.setConnected(player.slot, true);
        return true;
    }

    public connectViewer(connection: SocketStream): void {
        this.viewers.add(connection);
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

    public setupPlayerListeners(ticket: string, connection: SocketStream): void {
        connection.socket.on("message", (raw: string) => {
            try {
                const msg = JSON.parse(raw);
                
                if (msg.type !== "input") {
                    connection.socket.close(4000, "Invalid message type");
                    return;
                }
                
                const player = this.players.get(msg.ticket);
                if (!player) {
                    connection.socket.close(4001, "Invalid ticket");
                    return;
                }
                
                this.game_engine.movePaddle(player.slot, msg.move);
            } catch (error) {
                connection.socket.close(4002, "Invalid JSON");
            }
        });
        
        connection.socket.on("close", () => {
            this.disconnectPlayer(ticket);
            this.last_activity = Date.now();
        });
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
}