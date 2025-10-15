import { GameType } from "../../schemas";
import { PlayerSlot, Team } from "../../types";
import { Database } from "better-sqlite3";
export interface DbPlayerSession {
    user_id: number;
    team: Team;
    slot: PlayerSlot;
    score: number;
    winner: boolean;
}
export interface DbSession {
    session: {
        type: GameType;
        tournament_id: number | undefined;
        created_at: string;
        started_at: string;
        ended_at: string;
    };
    player_sessions: DbPlayerSession[];
}
export declare class SessionRepository {
    private db;
    constructor(db: Database);
    saveSession(session: DbSession): void;
}
//# sourceMappingURL=SessionRepository.d.ts.map