export var AuthErrorCode;
(function (AuthErrorCode) {
    AuthErrorCode["INVALID_TOKEN"] = "INVALID_TOKEN";
    AuthErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    AuthErrorCode["TOKEN_MALFORMED"] = "TOKEN_MALFORMED";
    AuthErrorCode["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
    AuthErrorCode["USER_NOT_FOUND"] = "USER_NOT_FOUND";
    AuthErrorCode["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    AuthErrorCode["ACCOUNT_LOCKED"] = "ACCOUNT_LOCKED";
    AuthErrorCode["SESSION_EXPIRED"] = "SESSION_EXPIRED";
    AuthErrorCode["KEY_ROTATION_FAILED"] = "KEY_ROTATION_FAILED";
    AuthErrorCode["JWKS_UPDATE_FAILED"] = "JWKS_UPDATE_FAILED";
})(AuthErrorCode || (AuthErrorCode = {}));
export class AuthError extends Error {
    constructor(code, message, statusCode = 401, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AuthError';
    }
}
export var PresenceErrorCode;
(function (PresenceErrorCode) {
    PresenceErrorCode["USER_NOT_ONLINE"] = "USER_NOT_ONLINE";
    PresenceErrorCode["PRESENCE_UPDATE_FAILED"] = "PRESENCE_UPDATE_FAILED";
    PresenceErrorCode["WEBSOCKET_CONNECTION_FAILED"] = "WEBSOCKET_CONNECTION_FAILED";
    PresenceErrorCode["REDIS_CONNECTION_FAILED"] = "REDIS_CONNECTION_FAILED";
})(PresenceErrorCode || (PresenceErrorCode = {}));
export class PresenceError extends Error {
    constructor(code, message, statusCode = 400, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'PresenceError';
    }
}
export var KeyRotationErrorCode;
(function (KeyRotationErrorCode) {
    KeyRotationErrorCode["KEY_GENERATION_FAILED"] = "KEY_GENERATION_FAILED";
    KeyRotationErrorCode["KEY_STORAGE_FAILED"] = "KEY_STORAGE_FAILED";
    KeyRotationErrorCode["KEY_CLEANUP_FAILED"] = "KEY_CLEANUP_FAILED";
    KeyRotationErrorCode["INVALID_KEY_ID"] = "INVALID_KEY_ID";
})(KeyRotationErrorCode || (KeyRotationErrorCode = {}));
export class KeyRotationError extends Error {
    constructor(code, message, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'KeyRotationError';
    }
}
//# sourceMappingURL=error.types.js.map