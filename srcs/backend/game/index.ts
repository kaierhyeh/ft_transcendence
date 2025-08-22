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
interface GameProperties {
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

interface GameState {
  type: string;
  tick: number;
  ball: Ball;
  paddle_y: [number, number];
  score: [number, number];
  ongoing: boolean;
}

interface PlayerInput {
  type: string;
  session_id: string;
  move: 'up' | 'down';
}

interface StartGameBody {
  session_id: string;
}

// Game configuration
const game_properties: GameProperties = {
  canvas_width: WIDTH,
  canvas_height: HEIGHT,
  paddle_width: PADDLE_WIDTH,
  paddle_height: PADDLE_HEIGHT,
  win_point: WIN_POINT,
  ball_size: BALL_SIZE,
};

// Game state
const game_state: GameState = {
  type: "state",
  tick: 0,
  ball: { x: WIDTH / 2, y: HEIGHT / 2, vx: BALL_SPEED, vy: BALL_SPEED / 2 },
  paddle_y: [
    HEIGHT / 2 - PADDLE_HEIGHT / 2,
    HEIGHT / 2 - PADDLE_HEIGHT / 2
  ],
  score: [0, 0],
  ongoing: false
};

// Player management
const player_ids: Map<string, number> = new Map();
player_ids.set("session_id_0", 0);
player_ids.set("session_id_1", 1);

let player_ready: Set<string> = new Set();
let game_result: Record<string, unknown> = {};

// Store connected WebSocket clients
const clients: Set<SocketStream> = new Set();

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
      client.socket.close(1001, "Game is finished");
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
fastify.get("/game/properties", async (request: FastifyRequest, reply: FastifyReply): Promise<GameProperties> => {
  return game_properties;
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

// WebSocket endpoint for real-time game updates
fastify.register(async function (fastify: FastifyInstance) {
  fastify.get('/game/ws', { websocket: true }, (connection: SocketStream, req: FastifyRequest) => {
    clients.add(connection);
    
    connection.socket.on('message', (message: Buffer) => {
      try {
        const input: PlayerInput = JSON.parse(message.toString());
        
        // Validate input structure
        if (!input.session_id || !input.move) {
          throw new Error("Invalid input format");
        }
        
        const player_id = player_ids.get(input.session_id);
        
        if (player_id === undefined) {
          throw new Error("Invalid session id");
        }
        
        // Process player movement
        if (input.move === "up" && game_state.paddle_y[player_id] > 0) {
          game_state.paddle_y[player_id] -= PADDLE_SPEED;
        }
        
        if (input.move === "down" && game_state.paddle_y[player_id] < HEIGHT - PADDLE_HEIGHT) {
          game_state.paddle_y[player_id] += PADDLE_SPEED;
        }
        
      } catch (err) {
        // Fix: Convert unknown to string for logging
        const errorMessage = err instanceof Error ? err.message : String(err);
        fastify.log.error('Invalid message: ' + errorMessage);
      }
    });
    
    connection.socket.on('close', () => {
      clients.delete(connection);
    });
    
    connection.socket.on('error', (error: Error) => {
      // Fix: Convert Error to string for logging
      fastify.log.error('WebSocket error: ' + error.message);
      clients.delete(connection);
    });
    
    // Send initial game state
    connection.socket.send(JSON.stringify(game_state));
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
