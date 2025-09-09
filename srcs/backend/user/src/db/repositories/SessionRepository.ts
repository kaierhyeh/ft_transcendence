import { GameType } from "../../schemas";
import { PlayerSlot, Team } from "../../types";
import { Database } from "better-sqlite3";

export interface DbPlayerSession {
    user_id: number,
    team: Team,
    slot: PlayerSlot,
    score: number,
    winner: boolean
}

export interface DbSession {
    session: {
        type: GameType,
        tournament_id: number | undefined,
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

    public saveSession(session: DbSession): void {
        const insertSession = this.db.prepare(`
            INSERT INTO sessions (type, tournament_id, created_at, started_at, ended_at)
            VALUES (@type, @tournament_id, @created_at, @started_at, @ended_at)
        `);

        const insertPlayerSession = this.db.prepare(`
            INSERT INTO player_sessions (session_id, user_id, team, player_slot, score, winner)
            VALUES (@session_id, @user_id, @team, @player_slot, @score, @winner)
        `);

        // Start a transaction so both inserts happen atomically
        const saveTransaction = this.db.transaction((sessionData: DbSession) => {
            const result = insertSession.run(sessionData.session);
            const session_id = result.lastInsertRowid as number;

            for (const player of sessionData.player_sessions) {
                insertPlayerSession.run({
                    session_id,
                    user_id: player.user_id,
                    team: player.team,
                    player_slot: player.slot,
                    score: player.score,
                    winner: player.winner ? 1 : 0,
                });
            }
        });

        saveTransaction(session);
    }
}
