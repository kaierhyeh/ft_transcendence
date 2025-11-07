import type { WebSocket } from 'ws';
import { GameParticipant, GameMode, GameFormat, GameCreationData, GameInvitation } from '../schemas';
import { Team, GameMessage, PlayerSlot } from '../types'
import { GameConf, GameEngine, GameState } from './GameEngine';
import { FastifyBaseLogger } from 'fastify';
import { DbPlayerSession, DbSession } from '../repositories/SessionRepository';
import { toSqlDate } from '../utils/db';
import { UsersClient } from '../clients/UsersClient';
import { CONFIG } from '../config';

type Player = GameParticipant & {
    team: Team;
    slot: PlayerSlot;
    socket?: WebSocket;
}

export type PublicPlayer =  Omit<Player, "participant_id"| "socket">;

export type PlayerMap = Map<string, Player>;

export type SessionPlayerMap = PlayerMap;

export interface GameEndedMessage {
    type: "game_ended";
    data: {
        reason: "player_disconnected" | "game_over";
        disconnected_player?: PublicPlayer;
    };
}

export class GameSession {
    private game_format: GameFormat;
    private tournament_id: number | undefined;
    private game_mode: GameMode;
    private players: PlayerMap;
    private viewers: Set<WebSocket>;
    private game_engine: GameEngine;
    private created_at: Date;
    private last_time: number | undefined;
    private started_at: Date | undefined;
    private ended_at: Date | undefined;
    private winner: Team | undefined;
    private disconnected_player_info?: Player;
    private forfeit: boolean = false;
    private online: boolean;
    private invitation: GameInvitation | undefined;

    // Private constructor - cannot be called directly
    private constructor(
        data: GameCreationData, 
        private logger: FastifyBaseLogger, 
        private usersClient: UsersClient,
        players: PlayerMap
    ) {
        this.game_format = data.format;
        this.game_mode = data.mode;
        this.tournament_id = data.tournament_id;
        this.online = data.online;
        this.players = players; // Already initialized
        this.viewers = new Set<WebSocket>();
        this.created_at = new Date();
        this.game_engine = new GameEngine(this.game_format, this.players);
        this.invitation = data.invitation;
    }

    // Static async factory method
    public static async create(
        data: GameCreationData,
        logger: FastifyBaseLogger,
        usersClient: UsersClient,
    ): Promise<GameSession> {
        // Fetch usernames asynchronously before construction
        const players = await GameSession.initPlayers_(data, usersClient);
        
        // Now construct the instance with pre-initialized players
        const session = new GameSession(data, logger, usersClient, players);
        return session;
    }

    private static async initPlayers_(
        data: GameCreationData,
        usersClient: UsersClient
    ): Promise<PlayerMap> {
        if (data.invitation) {
            return await GameSession.initInvitationPlayers_(data, usersClient);
        }
        else if (data.format === '1v1') {
            return await GameSession.init1v1Players_(data, usersClient);
        }
        else {
            return await GameSession.initMultiPlayers_(data, usersClient);
        }
    }

    private static async initInvitationPlayers_(
        data: GameCreationData,
        usersClient: UsersClient
    ): Promise<PlayerMap> {
        // Validation is done in LiveSessionManager.validateInvitationData()
        // This function just sets up the players for invitation mode
        
        // Validate invitation constraints (format, mode, online)
        if (data.format !== '1v1') {
            const error = new Error;
            (error as any).status = 400;
            (error as any).code = 'INVALID_INVITATION_FORMAT';
            error.message = `Invitations are only valid for 1v1 games`;
            throw error;
        }
        if (data.mode !== 'pvp') {
            const error = new Error;
            (error as any).status = 400;
            (error as any).code = 'INVALID_INVITATION_MODE';
            error.message = `Invitations can only be used in pvp mode`;
            throw error;
        }
        if (!data.online) {
            const error = new Error;
            (error as any).status = 400;
            (error as any).code = 'INVALID_INVITATION_ONLINE';
            error.message = `Invitations require online mode`;
            throw error;
        }
        const gameCreatorIsBlocked  = await usersClient.isBlocked(data.invitation?.fromId!, data.invitation?.toId!);
        if (gameCreatorIsBlocked) {
            const error = new Error;
            (error as any).status = 403;
            (error as any).code = 'INVITATION_BLOCKED';
            error.message = `Cannot create invitation: the invited user has blocked the game creator`;
            throw error;
        }
        const participants = data.participants;

        // Build players map (similar to 1v1)
        const players: PlayerMap = new Map();
        for (let idx = 0; idx < participants.length; idx++) {
            const p = participants[idx];
            const username = (await usersClient.getUserName(p.user_id!)).username;

            players.set(p.participant_id, {
                participant_id: p.participant_id,
                type: p.type,
                team: idx % 2 === 0 ? 'left' : 'right',
                slot: idx % 2 === 0 ? 'left' : 'right',
                user_id: p.user_id,
                username: username,
                socket: undefined,
            });
        }

        return players;
    }

    private static async init1v1Players_(
        data: GameCreationData,
        usersClient: UsersClient
    ): Promise<PlayerMap> {
        const participants = data.participants;
        const players: PlayerMap = new Map();

        for (let idx = 0; idx < participants.length; idx++) {
            const p = participants[idx];
            const username = p.user_id 
                ? (await usersClient.getUserName(p.user_id)).username 
                : undefined;

            players.set(p.participant_id, {
                participant_id: p.participant_id,
                type: p.type,
                team: idx % 2 === 0 ? 'left' : 'right',
                slot: idx % 2 === 0 ? 'left' : 'right',
                user_id: p.user_id,
                username: username,
                socket: undefined,
            });
        }

        return players;
    }

    private static async initMultiPlayers_(
        data: GameCreationData,
        usersClient: UsersClient
    ): Promise<PlayerMap> {
        const participants = data.participants;

        if (participants.length !== 4) {
            const error = new Error;
            (error as any).status = 400;
            (error as any).code = 'INVALID_PARTICIPANTS_NUMBER';
            error.message = `Multi-player games require exactly 4 participants, got ${participants.length}`;
            throw error;
        }

        const players: PlayerMap = new Map();
        for (let idx = 0; idx < participants.length; idx++) {
            const p = participants[idx];
            // Team assignment: first 2 players = "left", last 2 players = "right"
            const team: Team = idx < 2 ? "left" : "right";
            
            // Slot assignment based on array order
            const slot: PlayerSlot = GameSession.getMultiPlayerSlot_(idx);

            const username = p.user_id 
                ? (await usersClient.getUserName(p.user_id)).username 
                : undefined;

            players.set(p.participant_id, {
                participant_id: p.participant_id,
                type: p.type,
                team,
                slot,
                user_id: p.user_id,
                username: username,
                socket: undefined,
            });
        }

        return players;
    }

    private static getMultiPlayerSlot_(index: number): PlayerSlot {
        switch (index) {
        case 0: return "top-left";     // Player 1: top-left
        case 1: return "bottom-left";  // Player 2: bottom-left  
        case 2: return "top-right";    // Player 3: top-right
        case 3: return "bottom-right"; // Player 4: bottom-right
        default:
            throw new Error(
            `Invalid player index for multi-player: ${index}`
            );
        }
    }

    public get config(): GameConf {
        return this.game_engine.conf;
    }

    public get playersMap(): PlayerMap {
        return this.players;
    }

    public get isInvitation(): boolean {
        return this.invitation ? true : false;
    }

    public hasParticipantPair(participant_id_1: string, participant_id_2: string): boolean {
        const playerIds = Array.from(this.players.keys());
        if (playerIds.length !== 2) return false;
        
        return (playerIds[0] === participant_id_1 && playerIds[1] === participant_id_2) ||
               (playerIds[0] === participant_id_2 && playerIds[1] === participant_id_1);
    }

    public isUserGameCreator (user_id: number): boolean {
        return this.invitation !== undefined && this.invitation.fromId === user_id;
    }

    public canUserAccessInvitation(user_id: number): boolean {
        if (!this.invitation) return false;
        return this.invitation.fromId === user_id || this.invitation.toId === user_id;
    }

    public get started(): boolean {
        return this.started_at !== undefined;
    }

    public get timeout(): boolean {
        if (!this.started && this.created_at) {
            const elapsed = Date.now() - this.created_at.getTime();
            return elapsed > CONFIG.GAME.TIMEOUT;
        }
        return false;
    }

    public get over(): boolean {
        if (this.winner) {
            this.ended_at = new Date();
            this.logger.info(`Checking if game is over. Winner: ${this.winner}, Ended at: ${this.ended_at}, Forfeit: ${this.forfeit}`);
            return true;
        }
        return false;
    }

    public get disconnected_player(): PublicPlayer | undefined {
        if (this.disconnected_player_info) {
            return {
                    team: this.disconnected_player_info.team,
                    slot: this.disconnected_player_info.slot,
                    type: this.disconnected_player_info.type,
                    user_id: this.disconnected_player_info.user_id,
                    username: this.disconnected_player_info.username
            };
        }
    }

    public checkAndStart(): void {
        const started = Array.from(this.players.values()).every((p) => p.socket !== undefined);
        if (started && this.started_at === undefined) {
            this.started_at = new Date();
            this.last_time = Date.now();
        }
    }

    private get delta(): number | undefined {
        return this.last_time ? Date.now() - this.last_time : undefined;
    }

    public tick(): void {
        const delta = this.delta;
        if (delta && !this.winner) {
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
            if (connection) connection.send(payload);
        });
        this.viewers.forEach( connection => {
            connection.send(payload);
        });
    }
    
    public connectPlayer(participant_id: string, connection: WebSocket): void {
        const player = this.players.get(participant_id);

        this.logger.info(`Player connecting with participant_id: ${participant_id}`);
        this.logger.info(`found player : ${player !== undefined}`);

        if (!player) {
            connection.close(4001, "Invalid participant_id");
            return;
        }

        player.socket = connection;

        // Send player assignment info
        const assignmentMessage = {
            type: "player_assigned",
            team: player.team,
            slot: player.slot,
            username: player.username
        };
        connection.send(JSON.stringify(assignmentMessage));

        connection.on("message", (raw: string) => {
            const msg = JSON.parse(raw);
            if (msg.type === "input") {          
                this.game_engine.applyMovement(player.slot, msg.move);
            } else {
                connection.close(4000, "Invalid message type");
            }
        });

        connection.on("close", () => {
            this.disconnectPlayer(participant_id);
        });
    }

    public connectViewer(connection: WebSocket): void {
        this.viewers.add(connection);
        connection.on("close", () => {
            this.disconnectViewer(connection);
        });
    }

    public disconnectPlayer(participant_id: string): void {
        const player = this.players.get(participant_id);
        if (!player) return;
        player.socket = undefined;
        if (!this.winner) {
            this.forfeit = true;
            this.winner = player.team === 'left' ? 'right' : 'left';
            this.disconnected_player_info = player;
            this.logger.info(`Forfeit detected: Player ${participant_id} disconnected.`);
        }
        this.logger.info(`Player disconnected: ${participant_id}, slot: ${player.slot}, team: ${player.team}`);
    }
   
    public disconnectViewer(connection: WebSocket): void {
        this.viewers.delete(connection);
    }

    public closeAllConnections(status: number, reason: string): void {

        this.players.forEach(({ socket: connection }, participant_id) => {
            if (connection) {
                connection.close(status, reason);
                this.disconnectPlayer(participant_id);
            }
        });
        this.viewers.forEach( connection => {
            connection.close(status, reason);
            this.disconnectViewer(connection);
        });
    }

    public toDbRecord(): DbSession | undefined {
        const game_state = this.game_engine.state;
        if (!this.started_at || !this.ended_at || !this.winner || (this.forfeit && !this.online))
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
                online: this.online,
                forfeit: this.forfeit,
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
                    slot: p.slot,
                    score: game_state.score[p.team],
                    winner: this.winner === p.team
                };
                return player_session;
            })
        };
    }

}