const fastify = require("fastify")({ logger: true });

// Register WebSocket support
fastify.register(require('@fastify/websocket'));

// Constants
const PADDLE_SPEED = 6;
const WIDTH = 600;
const HEIGHT = 400;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const GAME_FPS = 60;

const game_data = {
  canvas_width: WIDTH,
  canvas_height: HEIGHT,
  paddle_width: PADDLE_WIDTH,
  paddle_height: PADDLE_HEIGHT,
  // Players public data
  players: [
    {
      paddleX: 0,
      paddleY: HEIGHT / 2 - PADDLE_HEIGHT / 2
    },
    {
      paddleX: WIDTH - PADDLE_WIDTH,
      paddleY: HEIGHT / 2 - PADDLE_HEIGHT / 2
    }
  ],
  // Add ball for complete pong
  ballX: WIDTH / 2,
  ballY: HEIGHT / 2,
  ballVX: 3,
  ballVY: 2
};

// Store connected clients
const clients = new Set();

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
  
  // Simple paddle collision (left side)
  if (game_data.ballX <= PADDLE_WIDTH && 
      game_data.ballY >= game_data.players[0].paddleY && 
      game_data.ballY <= game_data.players[0].paddleY + PADDLE_HEIGHT) {
    game_data.ballVX = -game_data.ballVX;
  }
  
  // Simple paddle collision (Right side)
  if (game_data.ballX >= WIDTH - PADDLE_WIDTH && 
      game_data.ballY >= game_data.players[1].paddleY && 
      game_data.ballY <= game_data.players[1].paddleY + PADDLE_HEIGHT) {
    game_data.ballVX = -game_data.ballVX;
  }
  
  // Broadcast game state to all connected clients
  broadcastGameState();
}

function broadcastGameState() {
  const gameState = JSON.stringify(game_data);

  clients.forEach(client => {
    if (client && client.readyState === WebSocket.OPEN) {
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
  fastify.get('/game/ws', { websocket: true }, (client, req) => {

    clients.add(client);
    
    client.on('message', (message) => {
      try {
        const input = JSON.parse(message);
        
        // Process player 0 input immediately
        if (input.w && game_data.players[0].paddleY > 0) {
          game_data.players[0].paddleY -= PADDLE_SPEED;
        }
        if (input.s && game_data.players[0].paddleY < HEIGHT - PADDLE_HEIGHT) {
          game_data.players[0].paddleY += PADDLE_SPEED;
        }
        // Process player 1 input immediately
        if (input.ArrowUp && game_data.players[1].paddleY > 0) {
          game_data.players[1].paddleY -= PADDLE_SPEED;
        }
        if (input.ArrowDown && game_data.players[1].paddleY < HEIGHT - PADDLE_HEIGHT) {
          game_data.players[1].paddleY += PADDLE_SPEED;
        }
      } catch (err) {
        fastify.log.error('Invalid message:', err);
      }
    });
    
    client.on('close', () => {
      clients.delete(client);
    });
    
    // Send initial game state
    client.send(JSON.stringify(game_data));
  });
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
