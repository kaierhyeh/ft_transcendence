import { GameConf, Team, GameType, GameParticipant, PlayerMap, PlayerSlot } from '../types'
import { GameEngine } from './GameEngine';
import { GameState } from './GameState';

export class GameSession {
    type: GameType;
    state: GameState;
    conf: GameConf;
    created_at: Date;
    started_at: Date | undefined;
    ended_at_: Date | undefined;
    winner_: Team | undefined;

    constructor(game_type: GameType, participants: GameParticipant[]) {
        this.type = game_type;
        this.state = new GameState(game_type);
        this.loadPlayers_(participants);
        this.conf = GameEngine.getConf(game_type);
        this.created_at = new Date();
    }


    // public toDbRecord (): DbSession {
    // ...
    // }

    private loadPlayers_(participants: GameParticipant[]): void {
        const players: PlayerMap = this.state.players;
        const game_type: GameType = this.type;

        participants.forEach((p, idx) => {
            if (game_type === 'multi')
                throw new Error("Multiplayer not implemented yet");
            
            const slot: PlayerSlot = idx === 0 ? "left" : "right";
            const team: Team = idx === 0 ? "left" : "right";
            
            players.set(slot, {
                player_id: p.player_id,
                session_id: p.session_id,
                team: team,
                paddle_coord: GameEngine.getPaddleFreshState(slot, game_type),
                ready: false
            });
        });
    }
}