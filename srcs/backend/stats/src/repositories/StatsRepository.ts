import { Database } from "better-sqlite3";

export interface LiteStats {
  wins: number;
  losses: number;
  curr_winstreak: number;
  best_winstreak: number;
  total_points_scored: number;
}

export interface LeaderboardEntry {
  user_id: number;
  total_points_scored: number;
}

export class StatsRepository {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    public getLiteStats(user_id: number): LiteStats | null {
        const stmt = this.db.prepare(`
            SELECT wins, losses, curr_winstreak, best_winstreak, total_points_scored
            FROM user_stats
            WHERE user_id = ?
        `);
        
        const row = stmt.get(user_id) as LiteStats | undefined;
        return row || null;
    }

    public upsertStats(user_id: number, stats: LiteStats): void {
        const stmt = this.db.prepare(`
            INSERT INTO user_stats (user_id, wins, losses, curr_winstreak, best_winstreak, total_points_scored, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(user_id) DO UPDATE SET
                wins = excluded.wins,
                losses = excluded.losses,
                curr_winstreak = excluded.curr_winstreak,
                                best_winstreak = CASE WHEN excluded.best_winstreak > best_winstreak THEN excluded.best_winstreak ELSE best_winstreak END,
                total_points_scored = excluded.total_points_scored,
                last_updated = datetime('now')
        `);
        
        stmt.run(user_id, stats.wins, stats.losses, stats.curr_winstreak, stats.best_winstreak, stats.total_points_scored);
    }

    public getLeaderboard(limit: number = 10): LeaderboardEntry[] {
        const stmt = this.db.prepare(`
            SELECT user_id, total_points_scored
            FROM user_stats
            ORDER BY total_points_scored DESC
            LIMIT ?
        `);
        
        return stmt.all(limit) as LeaderboardEntry[];
    }
}
