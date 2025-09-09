import { app } from "./src";

const start = async () => {
  try {
    await app.listen({ port: 3000, host: '127.0.0.1' });
    console.log('🚀 Server listening on http://127.0.0.1:3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
