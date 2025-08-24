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

// fixed place on the arena (left, right, top-left...)
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
  score: number;            // current score
  ready: boolean;
}

interface GameParticipant {
  player_id: number;        // permanent DB id
  session_id: string;       // ephemeral session id
}

interface GameCreationBody {
  participants: GameParticipant[];
}

interface GameState {
  tick: number;
  ball: Ball;
  players: Map<PlayerSlot, PlayerState>;
  websockets: Set<SocketStream>;
  ongoing: boolean;
}

type PublicPlayerState = Omit<PlayerState, "session_id" | "ready">;

interface PublicGameState extends Omit<GameState, "websockets" | "players"> {
  players: Partial<Record<PlayerSlot, PublicPlayerState>>;
}

interface PlayerInput {
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
  tick: 0,
  ball: { x: WIDTH / 2, y: HEIGHT / 2, vx: BALL_SPEED, vy: BALL_SPEED / 2 },
  players: new Map<PlayerSlot, PlayerState>(),
  websockets: new Set<SocketStream>(),
  ongoing: false
};

// Game sessions
const game_sessions: Map<number, GameSession> = new Map();

let game_result: Record<string, unknown> = {};
let next_id = 0;

function checkAndStartGame(game_session: GameSession): void {
  if (game_session.state.ongoing) {
    return ; // Game already started
  }
  const players = Array.from(game_session.state.players.values());
  const all_ready = players.every(p => p.ready);
  if (all_ready && players.length > 0) {
    game_session.state.ongoing = true;
    console.log(`Game ${game_session.id} started!`);
  }
}

function updateGameSession(game_session: GameSession): void {
 const { state } = game_session;
  
  // Update ball position
  state.ball.x += state.ball.vx;
  state.ball.y += state.ball.vy;
  
  // Ball collision with top/bottom walls
  if (state.ball.y <= 0 || state.ball.y >= HEIGHT) {
    state.ball.vy = -state.ball.vy;
  }
  
  // Ball collision with left/right walls (reset ball)
  if (state.ball.x <= 0 || state.ball.x >= WIDTH) {
    // Score update
    if (state.ball.x <= 0) {
      const right_player = state.players.get("right");
      if (right_player) right_player.score++;
    } else {
      const left_player = state.players.get("left");
      if (left_player) left_player.score++;
    }
    
    // Ball reset
    state.ball.x = WIDTH / 2;
    state.ball.y = HEIGHT / 2;
    state.ball.vx = -state.ball.vx;
  }
  
  // Paddle collision (left side)
  const left_player = state.players.get("left");
  if (left_player && state.ball.x <= PADDLE_WIDTH && 
      state.ball.y >= left_player.paddle_coord && 
      state.ball.y <= left_player.paddle_coord + PADDLE_HEIGHT) {
    state.ball.vx = -state.ball.vx;
  }
  
  // Paddle collision (right side)
  const right_player = state.players.get("right");
  if (right_player && state.ball.x >= WIDTH - PADDLE_WIDTH && 
      state.ball.y >= right_player.paddle_coord && 
      state.ball.y <= right_player.paddle_coord + PADDLE_HEIGHT) {
    state.ball.vx = -state.ball.vx;
  }

  // Check for game end
  const players = Array.from(state.players.values());
  const maxScore = Math.max(...players.map(p => p.score));
  if (maxScore >= WIN_POINT) {
    state.ongoing = false;
    // Set winner
    const winner = players.find(p => p.score === maxScore);
    if (winner) {
      game_session.winner_id = winner.player_id;
    }
  }

  state.tick++;
  
  // Broadcast game state to connected clients
  broadcastGameState(game_session);

  // Close connections when game ends
  if (!state.ongoing) {
    state.websockets.forEach(client => {
      client.socket.close(1001, "Game ended");
    });
    state.websockets.clear();
  }
}

// Game loop function
function updateGame(): void {

  game_sessions.forEach((game_session) => {
    if (!game_session.state.ongoing) {
      checkAndStartGame(game_session);
      return;
    }
    updateGameSession(game_session);
  });

}

function broadcastGameState(game_session: GameSession): void {
  const public_state = toPublicGameState(game_session.state);
  const data: string = JSON.stringify(public_state);

  game_session.state.websockets.forEach(client => {
    if (client && client.socket.readyState === client.socket.OPEN) {
      client.socket.send(data);
    }
  });
}

// Start game loop
setInterval(updateGame, 1000 / GAME_FPS);

// REST API Routes
fastify.get("/game/:id/conf", async (request, reply) => {
  const { id } = request.params as { id: number};
  
  const game_session: GameSession | undefined = game_sessions.get(id);
  if (game_session === undefined) {
    reply.code(404).send({error: "Game not found"});
    return ;
  }
  return game_session.conf;
});

function createGameSession(participants: GameParticipant[], game_id: number): GameSession {
  const new_game: GameSession = {
    id: game_id,
    conf: game_conf,
    state: default_state,
    created_at: new Date(),
    winner_id: undefined
  }
  participants.forEach((p, idx ) => 
    new_game.state.players.set(idx === 0 ? "left" : "right", 
      {
        player_id: p.player_id,
        session_id: p.session_id,
        paddle_coord: HEIGHT / 2 - PADDLE_HEIGHT / 2,
        score: 0,
        ready: false
      }
    )
  );
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
  reply.send({success: true, game_id: game_id});
});

fastify.post<{ Body: StartGameBody }>("/game/:id/join", async (request, reply) => {
  const { session_id } = request.body as { session_id: string };
  const { id } = request.params as { id: number};
  
  const game_session: GameSession | undefined = game_sessions.get(id);
  if (game_session === undefined) {
    reply.code(404).send({error: "Game not found"});
    return ;
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
        
        const player: PlayerState | undefined = Array.from(game_session.state.players.values())
          .find((player) => player.session_id === input.session_id);
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
