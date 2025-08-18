const fastify = require("fastify")({ logger: true });

fastify.get("/game/ping", async (request, reply) => {
   async function getUserData() {
        const url = "http://backend-user:3000/user/name";
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const user = await response.json();
            return { name: user.name };
        } catch (error) {
            return { error: error.message };
        }
    }
  const userData = await getUserData();
  return { message: "pong", user: userData };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
