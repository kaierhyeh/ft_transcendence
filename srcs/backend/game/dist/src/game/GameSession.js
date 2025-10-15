"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSession = void 0;
const GameEngine_1 = require("./GameEngine");
const config_1 = require("../config");
const utils_1 = require("../db/utils");
class GameSession {
    constructor(game_type, participants, logger) {
        this.type = game_type;
        this.game_mode = game_type === "multi" ? "multi" : "pvp";
        this.players = this.loadPlayers_(participants);
        this.viewers = new Set();
        this.created_at = new Date();
        this.last_activity = Date.now();
        this.game_engine = new GameEngine_1.GameEngine(this.game_mode, this.players);
        this.logger = logger;
    }
    loadPlayers_(participants) {
        const players = new Map();
        const slots = this.game_mode === "pvp" ? ["left", "right"] : ["top-left", "bottom-left", "top-right", "bottom-right"];
        participants.forEach((p, idx) => {
            const slot = slots[idx];
            const team = slot.includes("left") ? "left" : "right";
            players.set(p.participant_id, {
                user_id: p.user_id,
                participant_id: p.participant_id,
                slot: slot,
                team: team,
                is_ai: p.is_ai || false,
                socket: undefined
            });
        });
        return players;
    }
    get config() {
        return this.game_engine.conf;
    }
    get started() {
        return this.started_at !== undefined;
    }
    get over() {
        if (this.winner) {
            this.ended_at = new Date();
            this.logger.info(`Checking if game is over. Winner: ${this.winner}, Ended at: ${this.ended_at}`);
            return true;
        }
        return false;
    }
    checkAndStart() {
        const started = Array.from(this.players.values()).every((p) => p.socket !== undefined);
        if (started && this.started_at === undefined) {
            this.started_at = new Date();
            this.last_time = Date.now();
        }
    }
    get timeout() {
        const no_connection = Array.from(this.players.values()).every((p) => p.socket === undefined);
        return no_connection && (Date.now() - this.last_activity > config_1.CONFIG.GAME.SESSION_TIMEOUT);
    }
    get delta() {
        return this.last_time ? Date.now() - this.last_time : undefined;
    }
    tick() {
        const delta = this.delta;
        if (delta) {
            this.game_engine.update(delta);
            this.winner = this.game_engine.winner;
            this.last_time = Date.now();
        }
    }
    broadcastState() {
        const state = this.game_engine.state;
        const message = { type: "game_state", data: state };
        this.broadcast(message);
    }
    broadcast(message) {
        const payload = JSON.stringify(message);
        this.players.forEach(({ socket: connection }) => {
            if (connection)
                connection.socket.send(payload);
        });
        this.viewers.forEach(connection => {
            connection.socket.send(payload);
        });
    }
    connectPlayer(participant_id, connection) {
        if (this.viewers.has(connection)) {
            connection.socket.close(4001, "viewer cannot become a player");
            return;
        }
        const player = this.players.get(participant_id);
        this.logger.info(`Player connecting with participant_id: ${participant_id}`);
        this.logger.info(`found player : ${player !== undefined}`);
        if (!player) {
            connection.socket.close(4001, "Invalid participant_id");
            return;
        }
        if (player.socket) {
            connection.socket.close(4002, "duplicate participant_id");
            return;
        }
        player.socket = connection;
        this.game_engine.setConnected(player.slot, true);
        connection.socket.on("close", () => {
            this.disconnectPlayer(participant_id);
            this.last_activity = Date.now();
        });
    }
    connectViewer(connection) {
        if (this.viewers.has(connection)) {
            connection.socket.close(4001, "viewer can connect only once on the same websocket");
            return;
        }
        this.viewers.add(connection);
        connection.socket.on("close", () => {
            this.disconnectViewer(connection);
            this.last_activity = Date.now();
        });
    }
    disconnectPlayer(participant_id) {
        const player = this.players.get(participant_id);
        if (!player)
            return; // TODO - or throw an exception
        player.socket = undefined;
        this.game_engine.setConnected(player.slot, false);
    }
    disconnectViewer(connection) {
        this.viewers.delete(connection);
    }
    setupPlayerListeners(raw, connection) {
        const msg = JSON.parse(raw);
        if (msg.type === "join") {
            this.connectPlayer(msg.participant_id, connection);
        }
        else if (msg.type === "input") {
            if (this.viewers.has(connection)) {
                connection.socket.close(4001, "viewer cannot send input");
                return;
            }
            const player = this.players.get(msg.participant_id);
            if (!player) {
                connection.socket.close(4001, "Invalid participant_id");
                return;
            }
            this.game_engine.applyMovement(player.slot, msg.move);
        }
        else {
            connection.socket.close(4000, "Invalid message type");
        }
    }
    closeAllConnections(status, reason) {
        this.players.forEach(({ socket: connection }, participant_id) => {
            if (connection) {
                connection.socket.close(status, reason);
                this.disconnectPlayer(participant_id);
            }
        });
        this.viewers.forEach(connection => {
            connection.socket.close(status, reason);
            this.disconnectViewer(connection);
        });
    }
    toDbRecord() {
        const game_state = this.game_engine.state;
        if (!this.started_at || !this.ended_at || !game_state.winner)
            return undefined;
        const humanPlayers = Array.from(this.players.values()).filter(p => !p.is_ai);
        if (humanPlayers.length === 0) {
            return undefined;
        }
        return {
            session: {
                type: this.type,
                tournament_id: this.tournament_id,
                created_at: (0, utils_1.toSqlDate)(this.created_at),
                started_at: (0, utils_1.toSqlDate)(this.started_at),
                ended_at: (0, utils_1.toSqlDate)(this.ended_at),
            },
            player_sessions: humanPlayers.map((p) => {
                const player_session = {
                    user_id: p.user_id,
                    team: p.team,
                    slot: p.slot,
                    score: game_state.score[p.team],
                    winner: game_state.winner === p.team
                };
                return player_session;
            })
        };
    }
}
exports.GameSession = GameSession;
//# sourceMappingURL=GameSession.js.map