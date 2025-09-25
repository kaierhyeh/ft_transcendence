export declare enum AuthErrorCode {
    INVALID_TOKEN = "INVALID_TOKEN",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    TOKEN_MALFORMED = "TOKEN_MALFORMED",
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
    USER_NOT_FOUND = "USER_NOT_FOUND",
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
    SESSION_EXPIRED = "SESSION_EXPIRED",
    KEY_ROTATION_FAILED = "KEY_ROTATION_FAILED",
    JWKS_UPDATE_FAILED = "JWKS_UPDATE_FAILED"
}
export declare class AuthError extends Error {
    code: AuthErrorCode;
    statusCode: number;
    details?: any | undefined;
    constructor(code: AuthErrorCode, message: string, statusCode?: number, details?: any | undefined);
}
export declare enum PresenceErrorCode {
    USER_NOT_ONLINE = "USER_NOT_ONLINE",
    PRESENCE_UPDATE_FAILED = "PRESENCE_UPDATE_FAILED",
    WEBSOCKET_CONNECTION_FAILED = "WEBSOCKET_CONNECTION_FAILED",
    REDIS_CONNECTION_FAILED = "REDIS_CONNECTION_FAILED"
}
export declare class PresenceError extends Error {
    code: PresenceErrorCode;
    statusCode: number;
    details?: any | undefined;
    constructor(code: PresenceErrorCode, message: string, statusCode?: number, details?: any | undefined);
}
export declare enum KeyRotationErrorCode {
    KEY_GENERATION_FAILED = "KEY_GENERATION_FAILED",
    KEY_STORAGE_FAILED = "KEY_STORAGE_FAILED",
    KEY_CLEANUP_FAILED = "KEY_CLEANUP_FAILED",
    INVALID_KEY_ID = "INVALID_KEY_ID"
}
export declare class KeyRotationError extends Error {
    code: KeyRotationErrorCode;
    statusCode: number;
    details?: any | undefined;
    constructor(code: KeyRotationErrorCode, message: string, statusCode?: number, details?: any | undefined);
}
//# sourceMappingURL=error.types.d.ts.map