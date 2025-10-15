"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRepository = void 0;
class SessionRepository {
    constructor(db) {
        this.db = db;
    }
    saveSession(session) {
        const insertSession = this.db.prepare(`
            INSERT INTO sessions (type, tournament_id, created_at, started_at, ended_at)
            VALUES (@type, @tournament_id, @created_at, @started_at, @ended_at)
        `);
        const insertPlayerSession = this.db.prepare(`
            INSERT INTO player_sessions (session_id, user_id, team, player_slot, score, winner)
            VALUES (@session_id, @user_id, @team, @player_slot, @score, @winner)
        `);
        // Start a transaction so both inserts happen atomically
        const saveTransaction = this.db.transaction((sessionData) => {
            const result = insertSession.run(sessionData.session);
            const session_id = result.lastInsertRowid;
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
exports.SessionRepository = SessionRepository;
//# sourceMappingURL=SessionRepository.js.map