"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchmakingResponseSchema = exports.matchmakingRequestSchema = exports.createGameSchema = exports.gameIdSchema = exports.playerSchema = void 0;
exports.playerSchema = {
    type: "object",
    required: ["user_id", "participant_id"],
    properties: {
        user_id: { type: "number" },
        participant_id: { type: "string" },
        is_ai: { type: "boolean" },
    },
    additionalProperties: false,
};
exports.gameIdSchema = {
    type: "object",
    required: ["id"],
    properties: {
        id: { type: "number" },
    },
    additionalProperties: false,
};
exports.createGameSchema = {
    type: "object",
    required: ["type", "participants"],
    properties: {
        type: {
            type: "string",
            enum: ["solo", "pvp", "multi", "tournament"],
        },
        participants: {
            type: "array",
            minItems: 2,
            maxItems: 4,
            items: exports.playerSchema,
        },
    },
    additionalProperties: false,
};
//REMOTE_PLAYER_ADD
exports.matchmakingRequestSchema = {
    type: "object",
    required: ["mode", "participant_id"],
    properties: {
        mode: {
            type: "string",
            enum: ["2p", "4p"],
        },
        participant_id: { type: "string" },
    },
    additionalProperties: false,
};
exports.matchmakingResponseSchema = {
    type: "object",
    required: ["type"],
    properties: {
        type: {
            type: "string",
            enum: ["queue_joined", "game_ready", "queue_status", "error"],
        },
        mode: {
            type: "string",
            enum: ["2p", "4p"],
        },
        position: { type: "number" },
        players_needed: { type: "number" },
        game_id: { type: "number" },
        message: { type: "string" },
    },
    additionalProperties: false,
};
//END_REMOTE_PLAYER_ADD
//# sourceMappingURL=game.js.map