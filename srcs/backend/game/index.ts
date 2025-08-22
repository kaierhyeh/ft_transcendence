import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { SocketStream } from '@fastify/websocket';

// Initialize Fastify
const fastify: FastifyInstance = Fastify({ logger: true });

// Register WebSocket support
fastify.register(websocketPlugin);

// Constants
const PADDLE_SPEED: number = 9;
const WIDTH: number = 600;
const HEIGHT: number = 400;
const PADDLE_WIDTH: number = 10;
const PADDLE_HEIGHT: number = 80;
const GAME_FPS: number = 30;
const WIN_POINT: number = 11;
const BALL_SIZE: number = 10;
const BALL_SPEED: number = 6;

// Type definitions
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

type PlayerSlot =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

interface PlayerState {
  player_id: number;        // permanent DB id
  session_id: string;       // ephemeral session id
  paddle_coord: number;     // current paddle coordinate along its axis
  field_slot: PlayerSlot;   // fixed place on the arena (left, right, top-left...)
  score: number;            // current score
}

interface GameParticipant {
  player_id: number;        // permanent DB id
  session_id: string;       // ephemeral session id
}

interface GameCreationBody {
  participants: GameParticipant[];
}

interface GameState {
  type: string;
  tick: number;
  ball: Ball;
  players: PlayerState[];
  websockets: Set<SocketStream>;
  ongoing: boolean;
}

type PublicPlayerState = Omit<PlayerState, "session_id">;

interface PublicGameState extends Omit<GameState, "websockets" | "players"> {
  players: PublicPlayerState[];
}

interface PlayerInput {
  type: string;
  session_id: string;
  move: 'up' | 'down';
}

interface StartGameBody {
  session_id: string;
}

interface GameSession {
  id: number;
  conf: GameConf;
  state: GameState;
  created_at: Date;
  winner_id: number | undefined;
}

// Game configuration
const game_conf: GameConf = {
  canvas_width: WIDTH,
  canvas_height: HEIGHT,
  paddle_width: PADDLE_WIDTH,
  paddle_height: PADDLE_HEIGHT,
  win_point: WIN_POINT,
  ball_size: BALL_SIZE,
};

// Game state
const default_state: GameState = {
  type: "state",
  tick: 0,
  ball: { x: WIDTH / 2, y: HEIGHT / 2, vx: BALL_SPEED, vy: BALL_SPEED / 2 },
  players: [],
  websockets: new Set<SocketStream>(),
  ongoing: false
};

// Game sessions
const game_sessions: Map<number, GameSession> = new Map();

// Player management
const player_ids: Map<string, number> = new Map();
player_ids.set("session_id_0", 0);
player_ids.set("session_id_1", 1);

let player_ready: Set<string> = new Set();
let game_result: Record<string, unknown> = {};
let next_id = 0;

// Game loop function
function updateGame(): void {
  if (!game_state.ongoing) {
    return;
  }

  // Update ball position
  game_state.ball.x += game_state.ball.vx;
  game_state.ball.y += game_state.ball.vy;
  
  // Ball collision with top/bottom walls
  if (game_state.ball.y <= 0 || game_state.ball.y >= HEIGHT) {
    game_state.ball.vy = -game_state.ball.vy;
  }
  
  // Ball collision with left/right walls (reset ball)
  if (game_state.ball.x <= 0 || game_state.ball.x >= WIDTH) {
    // Score update
    if (game_state.ball.x <= 0) {
      game_state.score[1]++;
    } else {
      game_state.score[0]++;
    }
    
    // Ball reset
    game_state.ball.x = WIDTH / 2;
    game_state.ball.y = HEIGHT / 2;
    game_state.ball.vx = -game_state.ball.vx;
  }
  
  // Simple paddle collision (left side)
  if (game_state.ball.x <= PADDLE_WIDTH && 
      game_state.ball.y >= game_state.paddle_y[0] && 
      game_state.ball.y <= game_state.paddle_y[0] + PADDLE_HEIGHT) {
    game_state.ball.vx = -game_state.ball.vx;
  }
  
  // Simple paddle collision (right side)
  if (game_state.ball.x >= WIDTH - PADDLE_WIDTH && 
      game_state.ball.y >= game_state.paddle_y[1] && 
      game_state.ball.y <= game_state.paddle_y[1] + PADDLE_HEIGHT) {
    game_state.ball.vx = -game_state.ball.vx;
  }

  // Check for game end
  if (Math.max(...game_state.score) === WIN_POINT) {
    game_state.ongoing = false;
  }

  game_state.tick++;
  
  // Broadcast game state to all connected clients
  broadcastGameState();

  // Close connections when game ends
  if (!game_state.ongoing) {
    clients.forEach(client => {
      client.socket.close(1001, "Game ended");
    });
  }
}

function broadcastGameState(): void {
  const data: string = JSON.stringify(game_state);

  clients.forEach(client => {
    if (client && client.socket.readyState === client.socket.OPEN) {
      client.socket.send(data);
    }
  });
}

// Start game loop
setInterval(updateGame, 1000 / GAME_FPS);

// REST API Routes
fastify.get("/game/:id/conf", async (request, reply): Promise<GameConf> => {
  return game_conf;
});

function createGameSession(participants: GameParticipant[], game_id: number): GameSession {
  const new_game: GameSession = {
    id: game_id,
    conf: game_conf,
    state: default_state,
    created_at: new Date(),
    winner_id: undefined
  }
  new_game.state.players = participants.map((p, idx) => ({
    player_id: p.player_id,
    session_id: p.session_id,
    paddle_coord: HEIGHT / 2 - PADDLE_HEIGHT / 2,
    field_slot: idx === 0 ? "left" : "right",
    score: 0,
  }));
   return new_game;
}
  
fastify.post<{Body: GameCreationBody }>("/game/create", async (request, reply) => {
  const { participants } = request.body;

  if (participants.length != 2) {
    reply.code(400).send({error: "Invalid number of participant"})
    return ;
  }
  
  const game_id = next_id++;
  game_sessions.set(game_id, createGameSession(participants, game_id));
  reply.send({ success: true, game_id: game_id});
});

fastify.post<{ Body: StartGameBody }>("/game/start", async (request, reply) => {
  const { session_id } = request.body;
  
  if (!player_ids.has(session_id)) {
    reply.code(400).send({ error: "Invalid session_id" });
    return;
  }
  
  player_ready.add(session_id);
  game_state.ongoing = player_ready.size === 2;
  
  console.log("ongoing: ", game_state.ongoing);
  reply.send({ success: true, ongoing: game_state.ongoing });
});

function toPublicGameState(state: GameState): PublicGameState {
  return {
    ...state,
    players: state.players.map(({ session_id, ...rest}) => rest),
  }
}

// WebSocket endpoint for real-time game updates
fastify.register(async function (fastify: FastifyInstance) {
  fastify.get('/game/:id/ws', { websocket: true }, (connection: SocketStream, req: FastifyRequest) => {
    const { id } = req.params as { id: number};

    const game_session: GameSession | undefined = game_sessions.get(id);
    if (game_session === undefined) {
      connection.socket.close(1011, "Game id doens't exist");
      return ;
    }
    const { websockets } = game_session?.state as {websockets: Set<SocketStream>};

    websockets.add(connection);
    
    connection.socket.on('message', (message: Buffer) => {
      try {
        const input: PlayerInput = JSON.parse(message.toString());
        
        // Validate input structure
        if (!input.session_id || !input.move) {
          throw new Error("Invalid input format");
        }
        
        const { players } = game_session.state as {players: PlayerState[]};

        const player: PlayerState | undefined = players.find((player) => player.session_id === input.session_id);
        if (player === undefined) {
          throw new Error("Invalid session id");
        }
        
        // Process player movement
        if (input.move === "up" && player.paddle_coord > 0) {
          player.paddle_coord -= PADDLE_SPEED;
        }
        
        if (input.move === "down" && player.paddle_coord < HEIGHT - PADDLE_HEIGHT) {
          player.paddle_coord += PADDLE_SPEED;
        }
        
      } catch (err) {
        // Fix: Convert unknown to string for logging
        const errorMessage = err instanceof Error ? err.message : String(err);
        fastify.log.error('Invalid message: ' + errorMessage);
      }
    });
    
    connection.socket.on('close', () => {
      websockets.delete(connection);
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
});

// Server startup
const run = async (): Promise<void> => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    fastify.log.info('Game service started on port 3000');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    fastify.log.error('Server startup error: ' + errorMessage);
    process.exit(1);
  }
};

run();
