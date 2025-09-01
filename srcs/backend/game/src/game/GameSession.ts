import { GameCreationBody } from '../schemas';
import { GameConf, Team, GameType, PlayerMap, PlayerSlot, GameState } from '../types'
import { GameEngine } from './GameEngine';

export class GameSession {
    type: GameType;
    state: GameState;
    conf: GameConf;
    created_at: Date;
    started_at: Date | undefined;
    ended_at_: Date | undefined;
    winner_: Team | undefined;

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
        
        this.loadPlayers_(participants);
    }


    // public toDbRecord (): DbSession {
    // ...
    // }

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