const fastify = require("fastify")({ logger: true });

// Register WebSocket support
fastify.register(require('@fastify/websocket'));

// Constants
const PADDLE_SPEED = 9;
const WIDTH = 600;
const HEIGHT = 400;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const GAME_FPS = 30;
const WIN_POINT = 11;
const BALL_SIZE = 10;
const BALL_SPEED = 6;


const game_properties = {
  canvas_width: WIDTH,
  canvas_height: HEIGHT,
  paddle_width: PADDLE_WIDTH,
  paddle_height: PADDLE_HEIGHT,
  win_point: WIN_POINT,
  ball_size: BALL_SIZE,
};

const game_state = {
  type: "state",
  tick: 0,
  ball: {x: WIDTH / 2, y: HEIGHT / 2, vx: BALL_SPEED, vy: BALL_SPEED / 2},
  paddle_y: [
    HEIGHT / 2 - PADDLE_HEIGHT / 2,
    HEIGHT / 2 - PADDLE_HEIGHT / 2
  ],
  score: [0, 0],
  ongoing: false
}

const player_ids = new Map();
player_ids.set("session_id_0", 0);
player_ids.set("session_id_1", 1);

let player_ready = new Set();

let game_result = {};
// let interval_id;

// Store connected clients
const clients = new Set();

// Game loop function
function updateGame() {
  if (game_state.ongoing == false)
    return ;

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
    if (game_state.ball.x <= 0)
      game_state.score[1]++;
    else
      game_state.score[0]++;
    
    // Ball reset
    game_state.ball.x = WIDTH / 2;
    game_state.ball.y = HEIGHT/ 2;
    game_state.ball.vx = -game_state.ball.vx;
  }
  
  // Simple paddle collision (left side)
  if (game_state.ball.x <= PADDLE_WIDTH && 
      game_state.ball.y >= game_state.paddle_y[0] && 
      game_state.ball.y <= game_state.paddle_y[0] + PADDLE_HEIGHT) {
    game_state.ball.vx = -game_state.ball.vx;
  }
  
  // Simple paddle collision (Right side)
  if (game_state.ball.x >= WIDTH - PADDLE_WIDTH && 
      game_state.ball.y >= game_state.paddle_y[1] && 
      game_state.ball.y <= game_state.paddle_y[1] + PADDLE_HEIGHT) {
    game_state.ball.vx = -game_state.ball.vx;
  }

  if (Math.max(...game_state.score) == WIN_POINT)
    game_state.ongoing = false;

  game_state.tick++;
  
  // Broadcast game state to all connected clients
  broadcastGameState();

  if (game_state.ongoing == false) {
    clients.forEach(client => {
      client.close(1001, "Game is finished");
    });
  }
}

function broadcastGameState() {
  const data = JSON.stringify(game_state);

  clients.forEach(client => {
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Start game loop
setInterval(updateGame, 1000 / GAME_FPS);

fastify.get("/game/properties", async (request, reply) => {
  return game_properties;
});

// REST API for initial game data (less frequent)
fastify.post("/game/start", async (request, reply) => {
  const session_id = request.body.session_id;
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
// Input from client to server
// {
//   "type": "input",
//   "sessionId": "abc123",
//   "move": "up"
// }
fastify.register(async function (fastify) {
  fastify.get('/game/ws', { websocket: true }, (client, req) => {

    clients.add(client);
    
    client.on('message', (message) => {
      try {
        const input = JSON.parse(message);
        // console.log(input);

        // // light schema and data validation
        // if (input.type != "input")
        // {
        //   console.log("Bad message format");
        //   throw new Error("bad message format");
        // }
        // if (!player_ids.has(input.session_id))
        // {

        //   console.log("Invalid session id");
        //   throw new Error("Invalid session id");
        // }
        // console.log("game_state: ", game_state);
        const player_id =  player_ids.get(input.session_id);
        if (input.move == "up" && game_state.paddle_y[player_id] > 0) {
          // console.log("player id: ", player_id, " goes UP!");
           game_state.paddle_y[player_id] -= PADDLE_SPEED;
        }
        if (input.move == "down" && game_state.paddle_y[player_id] < HEIGHT - PADDLE_HEIGHT) {
          // console.log("player id: ", player_id, " goes down!");
          game_state.paddle_y[player_id] += PADDLE_SPEED;
        }
          // console.log("game_state: ", game_state);
      } catch (err) {
        fastify.log.error('Invalid message:', err);
      }
    });
    
    client.on('close', () => {
      clients.delete(client);
    });
    
    // Send initial game state
    client.send(JSON.stringify(game_state));
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
