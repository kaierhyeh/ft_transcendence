import { GameType } from "../../schemas";
import { PlayerSlot, Team } from "../../types";

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
        created_at: Date,
        started_at: Date,
        ended_at: Date,
    },
    player_sessions: DbPlayerSession[]
}