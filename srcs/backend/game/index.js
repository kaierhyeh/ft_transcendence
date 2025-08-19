const fastify = require("fastify")({ logger: true });

// Constants
const PADDLE_SPEED = 4;
const WIDTH = 600;
const HEIGHT = 400;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;

const game_data = {
  canvas_width: WIDTH,
  canvas_height: HEIGHT,
  paddle_width: PADDLE_WIDTH,
  paddle_height: PADDLE_HEIGHT,
  paddleY: HEIGHT / 2 - PADDLE_HEIGHT / 2  // or calculate this as 400/2 - 80/2 = 200 - 40 = 160
}

fastify.get("/game/data", async (request, reply) => {
  // API token and/or Cookie in the request maybe to ensure it has permission to access the route

  return JSON.stringify(game_data);
});

fastify.post("/game/input", async (request, reply) => {
  // API tokem and/or Cookie in the request maybe to ensure it has permission to access the route

  const keys = request.body;

  if (keys["ArrowUp"] && game_data.paddleY > 0)
    game_data.paddleY -= PADDLE_SPEED;
  if (keys["ArrowDown"] && game_data.paddleY < game_data.canvas_height - game_data.paddle_height)
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
