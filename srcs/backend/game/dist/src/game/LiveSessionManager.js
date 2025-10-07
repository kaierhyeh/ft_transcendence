"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveSessionManager = void 0;
const GameSession_1 = require("./GameSession");
let next_id = 1;
class LiveSessionManager {
    constructor(session_repo, logger) {
        this.game_sessions = new Map();
        this.logger = logger;
        this.session_repo = session_repo;
    }
    createGameSession(type, participants) {
        const game_id = next_id++;
        const new_game = new GameSession_1.GameSession(type, participants, this.logger);
        this.game_sessions.set(game_id, new_game);
        return game_id;
    }
    getGameSessionConf(id) {
        return this.game_sessions.get(id)?.config;
    }
    connectToGameSession(id, connection) {
        const session = this.game_sessions.get(id);
        if (!session) {
            connection.socket.close(4004, "Game not found");
            return;
        }
        connection.socket.on("message", (raw) => {
            try {
                const msg = JSON.parse(raw);
                if (msg.type === "view") {
                    session.connectViewer(connection);
                }
                else {
                    session.setupPlayerListeners(raw, connection);
                }
            }
            catch (err) {
                connection.socket.close(4002, "Invalid JSON");
            }
        });
    }
    saveSession(game_id, session) {
        try {
            const dto = session.toDbRecord();
            if (dto)
                this.session_repo.saveSession(dto); // save in db with db plugin I guess, taking dto: DbSession as argument
        }
        catch (err) {
            this.logger.warn({ game_id: game_id, error: err instanceof Error ? err.message : String(err) }, "Failed to save game session");
        }
        this.logger.info({ game_id: game_id }, "Game session saved");
    }
    terminateSession_(id, session) {
        this.saveSession(id, session);
        session.closeAllConnections(1001, "Game ended");
        this.game_sessions.delete(id);
    }
    update() {
        for (const id of this.game_sessions.keys()) {
            const game = this.game_sessions.get(id);
            if (!game)
                continue;
            if (!game.started) {
                game.checkAndStart();
                continue;
            }
            if (game.timeout) {
                this.game_sessions.delete(id);
                continue;
            }
            game.tick();
            game.broadcastState();
            if (game.over)
                this.terminateSession_(id, game);
        }
    }
}
exports.LiveSessionManager = LiveSessionManager;
//# sourceMappingURL=LiveSessionManager.js.map