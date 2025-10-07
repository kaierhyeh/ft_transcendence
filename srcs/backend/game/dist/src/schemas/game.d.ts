import { FromSchema } from "json-schema-to-ts";
export declare const playerSchema: {
    readonly type: "object";
    readonly required: readonly ["user_id", "participant_id"];
    readonly properties: {
        readonly user_id: {
            readonly type: "number";
        };
        readonly participant_id: {
            readonly type: "string";
        };
        readonly is_ai: {
            readonly type: "boolean";
        };
    };
    readonly additionalProperties: false;
};
export declare const gameIdSchema: {
    readonly type: "object";
    readonly required: readonly ["id"];
    readonly properties: {
        readonly id: {
            readonly type: "number";
        };
    };
    readonly additionalProperties: false;
};
export declare const createGameSchema: {
    readonly type: "object";
    readonly required: readonly ["type", "participants"];
    readonly properties: {
        readonly type: {
            readonly type: "string";
            readonly enum: readonly ["solo", "pvp", "multi", "tournament"];
        };
        readonly participants: {
            readonly type: "array";
            readonly minItems: 2;
            readonly maxItems: 4;
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["user_id", "participant_id"];
                readonly properties: {
                    readonly user_id: {
                        readonly type: "number";
                    };
                    readonly participant_id: {
                        readonly type: "string";
                    };
                    readonly is_ai: {
                        readonly type: "boolean";
                    };
                };
                readonly additionalProperties: false;
            };
        };
    };
    readonly additionalProperties: false;
};
export type GameParticipant = FromSchema<typeof playerSchema>;
export type GameIdParams = FromSchema<typeof gameIdSchema>;
export type GameCreationBody = FromSchema<typeof createGameSchema>;
export type GameType = GameCreationBody["type"];
export declare const matchmakingRequestSchema: {
    readonly type: "object";
    readonly required: readonly ["mode", "participant_id"];
    readonly properties: {
        readonly mode: {
            readonly type: "string";
            readonly enum: readonly ["2p", "4p"];
        };
        readonly participant_id: {
            readonly type: "string";
        };
    };
    readonly additionalProperties: false;
};
export declare const matchmakingResponseSchema: {
    readonly type: "object";
    readonly required: readonly ["type"];
    readonly properties: {
        readonly type: {
            readonly type: "string";
            readonly enum: readonly ["queue_joined", "game_ready", "queue_status", "error"];
        };
        readonly mode: {
            readonly type: "string";
            readonly enum: readonly ["2p", "4p"];
        };
        readonly position: {
            readonly type: "number";
        };
        readonly players_needed: {
            readonly type: "number";
        };
        readonly game_id: {
            readonly type: "number";
        };
        readonly message: {
            readonly type: "string";
        };
    };
    readonly additionalProperties: false;
};
export type MatchmakingRequest = FromSchema<typeof matchmakingRequestSchema>;
export type MatchmakingResponse = FromSchema<typeof matchmakingResponseSchema>;
export type MatchmakingMode = MatchmakingRequest["mode"];
//# sourceMappingURL=game.d.ts.map