import { GameMode } from "../schemas";
import { Team, PlayerType } from "../types";
import { Database } from "better-sqlite3";

export interface DbPlayerSession {
    user_id: number | null,
    type: PlayerType,
    team: Team,
    score: number,
    winner: boolean
}

export interface DbSession {
    session: {
        mode: GameMode,
        created_at: string,
        started_at: string,
        ended_at: string,
    },
    player_sessions: DbPlayerSession[]
}

export class SessionRepository {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    public save(session: DbSession): void {
        const insertSession = this.db.prepare(`
            INSERT INTO sessions (mode, created_at, started_at, ended_at)
            VALUES (@mode, @created_at, @started_at, @ended_at)
        `);

        const insertPlayerSession = this.db.prepare(`
            INSERT INTO player_sessions (session_id, user_id, type, team, score, winner)
            VALUES (@session_id, @user_id, @type, @team, @score, @winner)
        `);

        // Start a transaction so both inserts happen atomically
        const saveTransaction = this.db.transaction((sessionData: DbSession) => {
            const result = insertSession.run(sessionData.session);
            const session_id = result.lastInsertRowid as number;

            for (const player of sessionData.player_sessions) {
                insertPlayerSession.run({
                    session_id,
                    user_id: player.user_id,
                    type: player.type,
                    team: player.team,
                    score: player.score,
                    winner: player.winner ? 1 : 0,
                });
            }
        });

        saveTransaction(session);
    }
}
