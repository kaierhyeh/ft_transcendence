import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { SocketStream } from '@fastify/websocket';
import dbConnector from './db';

// Type declarations come from db.d.ts
// import Database from "better-sqlite3"; // (not needed here)

// ==========================
// Constants
// ==========================
const PADDLE_STEP: number = 9;
const WIDTH: number = 600;
const HEIGHT: number = 400;
const PADDLE_WIDTH: number = 10;
const PADDLE_HEIGHT: number = 80;
const UPDATE_PERIOD: number = 1000 / 30;
// const WIN_POINT: number = 11;
const WIN_POINT: number = 3;
const BALL_SIZE: number = 10;
const BALL_SPEED: number = 200;
const CONNECTION_TIMEOUT = 5000; // ms

// ==========================
// Game-related types
// ==========================
interface GameConf {
  canvas_width: number;
  canvas_height: number;
  paddle_width: number;
  paddle_height: number;
  win_point: number;
  ball_size: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface PlayerState {
  player_id: number;
  session_id: string;
  paddle_coord: number;
  ready: boolean;
}

type PlayerSlot =
  | 'top'
  | 'bottom';

interface TeamState {
  players: PlayerState[];
  score: number;
}

interface GameParticipant {
  player_id: number;
  session_id: string;
}

type GameType =
  | 'pvp'
  | 'multi'
  | 'tournament';

interface GameCreationBody {
  type: GameType;
  participants: GameParticipant[];
}

interface GameState {
  tick: number; // TODO - remove or keep?
  last_time: number; // TODO - remove or keep?
  last_connection_time: number;
  ball: Ball;
  left_team: TeamState;
  right_team: TeamState;
  websockets: Set<SocketStream>;
  ongoing: boolean;
}

type PublicPlayerState = Omit<PlayerState, 'session_id' | 'ready'>;

interface PublicGameState
  extends Omit<GameState, 'websockets' | 'teams' | 'last_connection_time'> {
  teams: Map<TeamSlot, PublicTeamState>;
}

interface JoinGameBody {
  session_id: string;
}

interface GameSession {
  id: number;
  type: GameType;
  conf: GameConf;
  state: GameState;
  created_at: Date;
  winner_id: number | undefined;
}

// ==========================
// Message types
// ==========================

interface MessageEnvelope {
  type: string;
  timestamp?: number;
}

type GameStateMessage = MessageEnvelope & {
  type: "game_state";
} & PublicGameState;

type  LogLevel = "info" | "warning" | "error";

type ServerMessage = MessageEnvelope & {
  type: "server_message";
  level: LogLevel;
  message: string;
  code?: string;
}


type PlayerInputMessage = MessageEnvelope & {
  type: "input";
  session_id: string;
  move: "up" | "down";
}

type WebSocketMessage = GameStateMessage | ServerMessage| PlayerInputMessage;

// ==========================
// Schemas
// ==========================

const createGameSchema = {
  body: {
    type: 'object',
    required: ['type', 'participants'],
    properties: {
      type: {
        type: 'string',
        enum: ['pvp', 'multi', 'tournament']
      },
      participants: {
        type: 'array',
        minItems: 2,
        maxItems: 2,
        items: {
          type: 'object',
          required: ['player_id', 'session_id'],
          properties: {
            player_id: { type: 'number' },
            session_id: { type: 'string' }
          },
          additionalProperties: false  // ← This would catch "id" instead of "player_id"
        }
      },
    additionalProperties: false
    }
  }
};


// ==========================
// Globals
// ==========================
const fastify: FastifyInstance = Fastify({ logger: true });
const game_sessions: Map<number, GameSession> = new Map();
let game_result: Record<string, unknown> = {};
let next_id = 0;

// ==========================
// Game logic (unchanged except safe use of fastify.db)
// ==========================
function checkAndStartGame(game_session: GameSession): void {
  if (game_session.state.ongoing) {
    return;
  }
  const players = Array.from(game_session.state.players.values());
  const all_ready = players.every((p) => p.ready);
  if (all_ready && players.length > 0) {
    game_session.state.ongoing = true;
    game_session.state.last_time = Date.now();
  }
}

function updateGameSession(game_session: GameSession): void {
  const { state } = game_session;

  const dt: number = Date.now() - state.last_time;
  state.ball.x += state.ball.vx * (dt / 1000);
  state.ball.y += state.ball.vy * (dt / 1000);

  if (state.ball.y <= 0 || state.ball.y + BALL_SIZE >= HEIGHT) {
    state.ball.vy = -state.ball.vy;
  }

  if (state.ball.x <= 0 || state.ball.x + BALL_SIZE >= WIDTH) {
    if (state.ball.x <= 0) {
      const right_player = state.teams.get('right');
      if (right_player) state.teams.get('right').score++;
    } else {
      const left_player = state.players.get('left');
      if (left_player) left_player.score++;
    }

    state.ball.x = WIDTH / 2;
    state.ball.y = HEIGHT / 2;
    state.ball.vx = -state.ball.vx;
  }

  const left_player = state.players.get('left');
  if (
    left_player &&
    state.ball.x <= PADDLE_WIDTH &&
    state.ball.y >= left_player.paddle_coord &&
    state.ball.y <= left_player.paddle_coord + PADDLE_HEIGHT
  ) {
    state.ball.vx = -state.ball.vx;
  }

  const right_player = state.players.get('right');
  if (
    right_player &&
    state.ball.x + BALL_SIZE >= WIDTH - PADDLE_WIDTH &&
    state.ball.y >= right_player.paddle_coord &&
    state.ball.y <= right_player.paddle_coord + PADDLE_HEIGHT
  ) {
    state.ball.vx = -state.ball.vx;
  }

  const players = Array.from(state.players.values());
  const maxScore = Math.max(...players.map((p) => p.score));
  if (maxScore >= WIN_POINT) {
    state.ongoing = false;
    const winner = players.find((p) => p.score === maxScore);
    if (winner) {
      console.log("[INFO]: we have a winner!");
      game_session.winner_id = winner.player_id;
    }
    else {
        fastify.log.error("No winner found!");
    }
  }

  state.tick++;
  state.last_time = Date.now();

  broadcastGameState(game_session);

  if (!state.ongoing) {
    saveSession(game_session);

    state.websockets.forEach((client) => {
      client.socket.close(1001, 'Game ended');
    });
    state.websockets.clear();
  }
}

function saveSession(game_session: GameSession): void {
  try {
    const saveGameInDb = fastify.db.prepare(
      `INSERT INTO sessions (
        type,
        tournament_id,
        player1_id,
        player2_id,
        player3_id,
        player4_id,
        score_player1,
        score_player2,
        score_player3,
        score_player4,
        winner_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const left_player = game_session.state.players.get("left");
    const right_player = game_session.state.players.get("right");
    const winner_id = game_session.winner_id;

    if (left_player === undefined || right_player === undefined || winner_id === undefined) 
      throw new Error("Invalid game session data");

    const created_at: string = game_session.created_at.toISOString().slice(0, 19).replace('T', ' ');
  
    saveGameInDb.run(
      game_session.type,
      null,
      left_player.player_id,
      right_player.player_id,
      null,
      null,
      left_player.score,
      right_player.score,
      null,
      null,
      winner_id,
      created_at
    );

    console.log(`[INFO] Game ${game_session.id} saved successfully`);
   } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[WARN] Failed to save game ${game_session.id}:`, errorMessage);
      fastify.log.warn({ gameId: game_session.id, error: errorMessage }, "Database save failed");
      
      broadcastServerMessage(game_session, "warning", "Game statistics could not be saved", "DB_SAVE_FAILED");
  }
}

function connectionTimeout(game_state: GameState): boolean
{
  return Date.now() - game_state.last_connection_time >= CONNECTION_TIMEOUT;
}

// Game loop function
function updateGame(): void {

  for (const key of game_sessions.keys()) {
    const game = game_sessions.get(key);
    if (!game) {
      continue ;
    }
    if (!game.state.ongoing) {
      checkAndStartGame(game);
      continue ;
    }
    if (game.state.websockets.size === 0 && connectionTimeout(game.state)) {
      console.log(`[WARN] Game ${key} timeout after 5s: no connected player`);
      game_sessions.delete(key);
      continue;
    }
    // else {
    //   if (game.state.tick % 30 === 0)
    //     console.log(`Game ${key} has ${game.state.websockets.size} connected players`);
    // }
    updateGameSession(game);
    if (!game.state.ongoing) {
      // save game session in database
      console.log(`[INFO] Game ${key} ended!`);
      game_sessions.delete(key);
    }
  }
}

function broadcastGameState(game_session: GameSession): void {
  const public_state = toPublicGameState(game_session.state);

  const message: GameStateMessage = {
    type: "game_state",
    ...public_state
  };

  const data: string = JSON.stringify(message);

  game_session.state.websockets.forEach(client => {
    if (client && client.socket.readyState === client.socket.OPEN) {
      client.socket.send(data);
    }
  });
}

function broadcastServerMessage(game_session: GameSession, level: LogLevel, message: string, code?: string): void {
  const serverMessage: ServerMessage = {
    type: "server_message",
    level,
    message,
    code,
    timestamp: Date.now()
  };

  const data = JSON.stringify(serverMessage);

  game_session.state.websockets.forEach(client => {
    if (client && client.socket.readyState === client.socket.OPEN) {
      client.socket.send(data);
    }
  });
}


function createGameSession(creation_data: GameCreationBody, game_id: number): GameSession {
  // Create a deep copy of default_state for each game session
  const fresh_state: GameState = {
    tick: 0,
    last_time: -1,
    last_connection_time: Date.now(),
    ball: { 
      x: WIDTH / 2, 
      y: HEIGHT / 2, 
      vx: BALL_SPEED, 
      vy: BALL_SPEED / 2 
    },
    players: new Map<PlayerSlot, PlayerState>(),
    websockets: new Set<SocketStream>(),
    ongoing: false
  };

  // Create a copy of game_conf (in case you want to customize per game)
  const fresh_conf: GameConf = {
    canvas_width: WIDTH,
    canvas_height: HEIGHT,
    paddle_width: PADDLE_WIDTH,
    paddle_height: PADDLE_HEIGHT,
    win_point: WIN_POINT,
    ball_size: BALL_SIZE,
  };

  const new_game: GameSession = {
    id: game_id,
    type: creation_data.type,
    conf: fresh_conf,        // Use fresh copy
    state: fresh_state,      // Use fresh copy
    created_at: new Date(),
    winner_id: undefined
  }

  creation_data.participants.forEach((p, idx) => 
    new_game.state.players.set(idx === 0 ? "left" : "right", {
      player_id: p.player_id,
      session_id: p.session_id,
      paddle_coord: HEIGHT / 2 - PADDLE_HEIGHT / 2,
      score: 0,
      ready: false
    })
  );

  return new_game;
}

function toPublicGameState(state: GameState): PublicGameState {
  const playersObject = Object.fromEntries(
    Array.from(state.players.entries()).map(([slot, player]) => {
      const { session_id, ready, ...publicPlayer } = player;
      return [slot, publicPlayer];
    })
  );
  return {
    ...state,
    players: playersObject,
  };
}


// ==========================
// Startup
// ==========================
async function main() {
  try {
    // 1) Register DB first
    await fastify.register(dbConnector);

    // 2) Register WebSocket
    await fastify.register(websocketPlugin);

    // 3) Register routes
    await fastify.register(async function (fastify) {
      // REST API Routes
        fastify.get("/:id/conf", async (request, reply) => {
          const { id } = request.params as { id: string };
          const game_id = parseInt(id, 10);
          
          if (isNaN(game_id)) {
            reply.code(400).send({error: "Invalid game ID"});
            return;
          }
          
          const game_session: GameSession | undefined = game_sessions.get(game_id);
          if (game_session === undefined) {
            reply.code(404).send({error: "Game not found"});
            return;
          }
          return game_session.conf;
        });

        fastify.post<{Body: GameCreationBody }>("/create", { schema: createGameSchema }, async (request, reply) => {
          const creation_data = request.body as GameCreationBody;

          const game_id = next_id++;
          game_sessions.set(game_id, createGameSession(creation_data, game_id));
          reply.send({game_id: game_id});
        });

        fastify.post<{ Body: JoinGameBody }>("/:id/join", async (request, reply) => {
          const { session_id } = request.body as { session_id: string };
          const { id } = request.params as { id: string }; // Correct: params are strings
          
          const game_id = parseInt(id, 10); // Convert string to number
          if (isNaN(game_id)) {
            reply.code(400).send({error: "Invalid game ID"});
            return;
          }
          
          // console.log("game id:", game_id);
          const game_session: GameSession | undefined = game_sessions.get(game_id); // Use number
          console.log(game_sessions);
          // console.log(game_sessions.get(game_id));
          
          if (game_session === undefined) {
            reply.code(404).send({error: "Game not found"});
            return;
          }
          const player: PlayerState | undefined = Array.from(game_session.state.players.values())
            .find((player) => player.session_id === session_id);
          if (player === undefined) {
            reply.code(403).send({error: "Invalid session_id"});
            return;
          }
          player.ready = true;
          reply.send({success: true});
        });

        // WebSocket endpoint for real-time game updates
        fastify.get('/:id/ws', { websocket: true }, (connection: SocketStream, req: FastifyRequest) => {
          const { id } = req.params as { id: string };
          const game_id = parseInt(id, 10);
          
          if (isNaN(game_id)) {
            connection.socket.close(1011, "Invalid game ID");
            return;
          }

          const game_session: GameSession | undefined = game_sessions.get(game_id);
          if (game_session === undefined) {
            connection.socket.close(1011, "Game id doens't exist");
            return ;
          }
          const { websockets } = game_session?.state as {websockets: Set<SocketStream>};

          websockets.add(connection);
          game_session.state.last_connection_time = Date.now(); // Update when connection added
          
          connection.socket.on('message', (message: Buffer) => {
            try {
              const input: PlayerInputMessage = JSON.parse(message.toString()) as PlayerInputMessage;
              
              // Validate input structure
              if (!input.type || input.type !== "input" || !input.session_id || !input.move || (input.move !== "up" && input.move !== "down")) {
                throw new Error("Invalid input format");
              }
              
              const player: PlayerState | undefined = Array.from(game_session.state.players.values())
                .find((player) => player.session_id === input.session_id);
              if (player === undefined) {
                throw new Error("Invalid session id");
              }
              
              // Process player movement
              if (input.move === "up" && player.paddle_coord > 0) {
                player.paddle_coord -= PADDLE_STEP;
              }
              
              if (input.move === "down" && player.paddle_coord < HEIGHT - PADDLE_HEIGHT) {
                player.paddle_coord += PADDLE_STEP;
              }
              
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : String(err);
              fastify.log.error('Invalid message: ' + errorMessage);
              // TODO: you may inform the client of the problem
            }
          });
          
          connection.socket.on('close', () => {
            fastify.log.warn("A connection closed on game " + game_session.id);
            websockets.delete(connection);
            game_session.state.last_connection_time = Date.now(); // Update when connection removed
          });
          
          connection.socket.on('error', (error: Error) => {
            // Fix: Convert Error to string for logging
            fastify.log.error('WebSocket error: ' + error.message);
            websockets.delete(connection);
          });
          
          const public_game_state: PublicGameState = toPublicGameState(game_session.state);
          // Send initial game state
          connection.socket.send(JSON.stringify(public_game_state));
        });
    }, { prefix: '/game' });

    // 4) Start game loop AFTER DB is available
    setInterval(updateGame, UPDATE_PERIOD);

    // 5) Start server
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info('Game service started on port 3000');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    fastify.log.error('Server startup error: ' + errorMessage);
    process.exit(1);
  }
}

main();
