import { SocketStream } from '@fastify/websocket';
import { GameCreationBody, GameParticipant } from '../schemas';
import { GameConf, Team, GameType, PlayerMap, PlayerSlot, GameState, GameMessage } from '../types'
import { GameEngine } from './GameEngine';

export class GameSession {
    private type: GameType;
    private state: GameState;
    private conf: GameConf;
    private created_at: Date;
    private started_at: Date | undefined;
    private ended_at_: Date | undefined;
    private winner_: Team | undefined;
    private connections: Map<SocketStream, number>;

    
    constructor(game_type: GameCreationBody["type"], participants: GameParticipant[]) {
        this.type = game_type;
        this.state = {
            type: game_type,
            last_time: undefined,
            players: new Map(),
            ball: undefined,
            score: {left: 0, right: 0},
            ongoing: false
        };
        this.conf = GameEngine.getConf(game_type);
        this.created_at = new Date();
        this.connections = new Map();
        
        this.loadPlayers_(participants);
    }

    public addConnection(player_id: number, connection: SocketStream): void {
        this.connections.set(connection, player_id);
        // this.state.players.g

        const { websockets } = game_session?.state as {websockets: Set<SocketStream>};

        websockets.add(connection);
        game_session.state.last_connection_time = Date.now(); // Update when connection added
    
        connection.socket.on('message', (message: Buffer) => {
            try {
                const input: PlayerInputMessage = JSON.parse(message.toString()) as PlayerInputMessage;
                
                // Validate input structure
                if (!input.type || input.type !== "input" || !input.session_id || !input.move || (input.move !== "up" && input.move !== "down")) {
                throw new Error("Invalid input format");
                }
                session.handlePlayerInput(input);
                
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                fastify.log.error('Invalid message: ' + errorMessage);
                // TODO: you may inform the client of the problem
            }
        });
    
        connection.socket.on('close', () => {
            fastify.log.warn("A connection closed on game " + game_session.id);
            websockets.delete(connection);
            game_session.state.last_connection_time = Date.now(); // Update when connection removed
        });
        
        connection.socket.on('error', (error: Error) => {
            // Fix: Convert Error to string for logging
            fastify.log.error('WebSocket error: ' + error.message);
            websockets.delete(connection);
        });
    }

    public removeConnection(connection: SocketStream, status: number, reason: string): void {

    }

    public closeAllConnections(status: number, reason: string): void {

    }   

    public broadcast(message: GameMessage): void {
        const str = JSON.stringify(message);
        for (const conn of this.sockets) conn.socket.send(str);
    }
    
    public broadcastState(): void {
        const message = Message.make("game_state", this.engine_.publicState());
        this.broadcast_(message);

    }
    public handlePlayerInput(message: GameMessage): void {
    
        const player: PlayerState | undefined = Array.from(game_session.state.players.values())
        .find((player) => player.session_id === input.session_id);
        if (player === undefined) {
        throw new Error("Invalid session id");
        }
    }

    public update() {

    }

    public started(): boolean {
        return false;
    }

    public timeout(): boolean {
        return false;
    }

    public over(): boolean {
        if (this.winner_)
            return true;
        return false;
    }

    public checkAndStart(): void {

    }

    public config(): GameConf {
        return GameEngine.getConf(this.type);
    }

    public join(participant: GameParticipant): boolean {
        const player = Array.from(this.state.players.values())
            .find((p) => p.match_ticket === participant.match_ticket);
        if (!player)
            return false;
        player.ready = true;
        return true;
    }


    // if (this.ball === undefined) {
    //     throw new Error("Ball is undefined");
    // }
    // return {
    //     ball: { ...this.ball },
    //     players: Object.fromEntries(
    //         [...this.players].map(([slot, p]) => [slot, {
    //             player_id: p.player_id,
    //             paddle_coord: p.paddle_coord,
    //             team: p.team
    //         }])
    //     ) as SerializedPlayerMap,
    //     scores: { ...this.score }
    // };

    private loadPlayers_(participants: GameCreationBody["participants"][number][]): void {
        const players: PlayerMap = this.state.players;
        const game_type = this.type;

        participants.forEach((p, idx) => {
            if (game_type === 'multi')
                throw new Error("Multiplayer not implemented yet");
            
            const slot: PlayerSlot = idx === 0 ? "left" : "right";
            const team: Team = idx === 0 ? "left" : "right";
            
            players.set(slot, {
                player_id: p.player_id,
                match_ticket: p.match_ticket,
                team: team,
                paddle_coord: GameEngine.getPaddleFreshState(slot, game_type),
                ready: false
            });
        });
    }
}