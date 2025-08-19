const fastify = require("fastify")({ logger: true });

// Register WebSocket support
fastify.register(require('@fastify/websocket'));

// Constants
const PADDLE_SPEED = 4;
const WIDTH = 600;
const HEIGHT = 400;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const GAME_FPS = 30; // Reduce from 60fps to 30fps for server efficiency

const game_data = {
  canvas_width: WIDTH,
  canvas_height: HEIGHT,
  paddle_width: PADDLE_WIDTH,
  paddle_height: PADDLE_HEIGHT,
  paddleY: HEIGHT / 2 - PADDLE_HEIGHT / 2,
  // Add ball for complete pong
  ballX: WIDTH / 2,
  ballY: HEIGHT / 2,
  ballVX: 3,
  ballVY: 2
};

// Store connected clients
const clients = new Set();

;

// Game loop function
function updateGame() {
  // Update ball position
  game_data.ballX += game_data.ballVX;
  game_data.ballY += game_data.ballVY;
  
  // Ball collision with top/bottom walls
  if (game_data.ballY <= 0 || game_data.ballY >= HEIGHT) {
    game_data.ballVY = -game_data.ballVY;
  }
  
  // Ball collision with left/right walls (reset ball)
  if (game_data.ballX <= 0 || game_data.ballX >= WIDTH) {
    game_data.ballX = WIDTH / 2;
    game_data.ballY = HEIGHT / 2;
    game_data.ballVX = -game_data.ballVX;
  }
  
  // Simple paddle collision (left side only for now)
  if (game_data.ballX <= PADDLE_WIDTH && 
      game_data.ballY >= game_data.paddleY && 
      game_data.ballY <= game_data.paddleY + PADDLE_HEIGHT) {
    game_data.ballVX = -game_data.ballVX;
  }
  
  // Broadcast game state to all connected clients
  broadcastGameState();
}

function broadcastGameState() {
  const gameState = JSON.stringify(game_data);
  clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(gameState);
    }
  });
}

// Start game loop
setInterval(updateGame, 1000 / GAME_FPS);

// REST API for initial game data (less frequent)
fastify.get("/game/data", async (request, reply) => {
  return game_data;
});

// WebSocket endpoint for real-time game updates
fastify.register(async function (fastify) {
  fastify.get('/game/ws', { websocket: true }, (connection, req) => {
    clients.add(connection.socket);
    
    connection.socket.on('message', (message) => {
      try {
        const input = JSON.parse(message);
        
        // Process player input immediately
        if (input.ArrowUp && game_data.paddleY > 0) {
          game_data.paddleY -= PADDLE_SPEED;
        }
        if (input.ArrowDown && game_data.paddleY < HEIGHT - PADDLE_HEIGHT) {
          game_data.paddleY += PADDLE_SPEED;
        }
      } catch (err) {
        fastify.log.error('Invalid message:', err);
      }
    });
    
    connection.socket.on('close', () => {
      clients.delete(connection.socket);
    });
    
    // Send initial game state
    connection.socket.send(JSON.stringify(game_data));
  });
});

// Keep the old POST endpoint for backward compatibility
fastify.post("/game/input", async (request, reply) => {
  const keys = request.body;

  if (keys["ArrowUp"] && game_data.paddleY > 0)
    game_data.paddleY -= PADDLE_SPEED;
  if (keys["ArrowDown"] && game_data.paddleY < HEIGHT - PADDLE_HEIGHT)
    game_data.paddleY += PADDLE_SPEED;

  reply.code(204);
});


const run = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

run();
