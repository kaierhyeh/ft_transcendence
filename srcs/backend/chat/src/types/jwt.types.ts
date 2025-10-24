export enum JWTType {
	INTERNAL_ACCESS = 'INTERNAL_ACCESS',
	GAME_SESSION = 'GAME_SESSION',
	USER_SESSION = 'USER_SESSION'
}

// Base JWT payload interface
export interface JWTPayload {
	type: JWTType;
	sub?: string;
	iat?: number;
	exp?: number;
	iss?: string;
}

// Internal Access JWT payload for service-to-service communication
export interface InternalAccessPayload extends JWTPayload {
	type: JWTType.INTERNAL_ACCESS;
}

// Game Session JWT payload
export interface GameSessionPayload extends JWTPayload {
	type: JWTType.GAME_SESSION;
	sub: string;
	game_id: number;
}

// User Session JWT payload
export interface UserSessionPayload extends JWTPayload {
	type: JWTType.USER_SESSION;
	token_type: "access";
	sub: string;
}
