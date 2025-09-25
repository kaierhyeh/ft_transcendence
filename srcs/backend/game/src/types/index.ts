import { PlayerType } from './game';

export interface Result {
    success: boolean;
    status: number;
    msg: string;
}

export interface JwtGameSessionPayload {
  sub: string;           // user ID
  game_id: number;
  player_id: number;
  type: PlayerType,
  tournament_id?: number;
  iat: number;           // issued at
  exp: number;           // expiration
}

export * from './game';