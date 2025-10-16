import { GameFormat, GameMode } from "../schemas";
import { Team, PlayerType, PlayerSlot } from "../types";
import { Database } from "better-sqlite3";

export interface DbPlayerSession {
    user_id: number | null,
    username: string | null,
    type: PlayerType,
    team: Team,
    slot: PlayerSlot,
    score: number,
    winner: boolean
}

interface SessionRow {
    format: GameFormat,
    mode: GameMode,
    tournament_id: number | null,
    online: boolean,
    forfeit: boolean,
    created_at: string,
    started_at: string,
    ended_at: string,
}

export interface DbSession {
    session: SessionRow,
    player_sessions: DbPlayerSession[]
}

type SessionData = SessionRow & {
    players: DbPlayerSession[]
}

type SessionQueryRow = Omit<SessionRow, "player_sessions"> & {
    player_sessions: string;
}

interface CountResult {
    total_records: number;
}

interface Pagination {
    total_records: number;
    current_page: number;
    total_pages: number;
    next_page: number | null;
    prev_page: number | null;
}

export interface SessionsPayload {
    data: SessionData[];
    pagination: Pagination;
}

export class SessionRepository {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    public save(session: DbSession): void {
        const insertSession = this.db.prepare(`
            INSERT INTO sessions (format, tournament_id, mode, online, forfeit, created_at, started_at, ended_at)
            VALUES (@format, @tournament_id, @mode, @online, @forfeit, @created_at, @started_at, @ended_at)
        `);

        const insertPlayerSession = this.db.prepare(`
            INSERT INTO player_sessions (session_id, user_id, username, type, team, slot, score, winner)
            VALUES (@session_id, @user_id, @username, @type, @team, @slot, @score, @winner)
        `);

        // Start a transaction so both inserts happen atomically
        const saveTransaction = this.db.transaction((sessionData: DbSession) => {
            const result = insertSession.run({
                ...sessionData.session,
                online: sessionData.session.online ? 1 : 0,
                forfeit: sessionData.session.forfeit ? 1 : 0,
            });
            const session_id = result.lastInsertRowid as number;

            for (const player of sessionData.player_sessions) {
                insertPlayerSession.run({
                    session_id,
                    user_id: player.user_id,
                    username: player.username,
                    type: player.type,
                    team: player.team,
                    slot: player.slot,
                    score: player.score,
                    winner: player.winner ? 1 : 0,
                });
            }
        });

        saveTransaction(session);
    }

    public get(page: number, limit: number, user_id: number | null): SessionsPayload {
        const offset = (page - 1) * limit;

        // Get total records
        const countStmt = this.db.prepare(`
            SELECT COUNT(*) AS total_records
            FROM sessions s
            WHERE (:user_id IS NULL
                    OR s.id IN (SELECT session_id FROM player_sessions WHERE user_id = :user_id)
            );
        `);

        const { total_records } = countStmt.get({ user_id }) as CountResult;

        // Retrieve data
        const dataStmt = this.db.prepare(`
            WITH filtered_sessions AS (
                SELECT s.id, s.format, s.mode, s.tournament_id, s.online, s.forfeit, s.created_at, s.started_at, s.ended_at
                FROM sessions s
                WHERE (:user_id IS NULL OR s.id IN (SELECT session_id FROM player_sessions WHERE user_id = :user_id))
                ORDER BY s.created_at DESC
                LIMIT :limit OFFSET :offset
            )
            SELECT
                fs.format,
                fs.mode,
                fs.tournament_id,
                fs.online,
                fs.forfeit,
                fs.created_at,
                fs.started_at,
                fs.ended_at,
                json_group_array(
                json_object(
                    'user_id', ps.user_id,
                    'username', ps.username,
                    'type', ps.type,
                    'team', ps.team,
                    'slot', ps.slot,
                    'score', ps.score,
                    'winner', ps.winner
                )
                ) AS player_sessions
            FROM filtered_sessions fs
            JOIN player_sessions ps ON fs.id = ps.session_id
            GROUP BY fs.id
            ORDER BY fs.created_at DESC;
        `);
        
        const rows = dataStmt.all({ user_id, limit, offset}) as SessionQueryRow[];

        const data: SessionData[] = rows.map(({ player_sessions, ...rest }) => ({
            ...rest,
            players: JSON.parse(player_sessions) as DbPlayerSession[]
        }));
        
        // Pagination meta
        const total_pages = Math.ceil(total_records / limit);
        const pagination: Pagination = {
            total_records,
            current_page: page,
            total_pages,
            next_page: page < total_pages ? page + 1 : null,
            prev_page: page > 1 ? page - 1 : null
        };

        return {data, pagination};

    }
}
