import { SocketStream } from '@fastify/websocket';
import { GameCreationBody } from '../schemas';
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

    constructor(game_type: GameCreationBody["type"], participants: GameCreationBody["participants"][number][]) {
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
    }

    public removeConnection(connection: SocketStream, status: number, reason: string): void {

    }

    public closeAllConnections(): void {

    }

    // public connectionsCount():number
    public connectedPlayerCount(): number {
        return 0;
    }    

    private broadcast_(message: GameMessage): void {
        const str = JSON.stringify(message);
        for (const conn of this.sockets) conn.socket.send(str);
    }
    
    public broadcastState(): void {
        const message = Messenger.make("game_state", state);
        this.broadcast_(message);

    }
    public handlePlayerInput(message: GameMessage): void {

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
        return false;
    }

    public checkAndStart(): void {

    }

    // toPublic(): PublicGameState {
    //     if (this.ball === undefined) {
    //         throw new Error("Ball is undefined");
    //     }
    //     return {
    //         ball: { ...this.ball },
    //         players: Object.fromEntries(
    //             [...this.players].map(([slot, p]) => [slot, {
    //                 player_id: p.player_id,
    //                 paddle_coord: p.paddle_coord,
    //                 team: p.team
    //             }])
    //         ) as SerializedPlayerMap,
    //         scores: { ...this.score }
    //     };
    // }

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