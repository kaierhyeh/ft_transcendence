// application configuration — things like environment variables, ports, database paths, secrets, etc.

// example :

import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config();

export const config = {
  app: {
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    env: process.env.NODE_ENV || "development",
  },
  db: {
    sqlitePath: process.env.SQLITE_PATH || path.join(__dirname, "../../chat.db"),
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || "supersecret",
    tokenExpiry: "1h",
  }
};

export default config;

// export const CONFIG = {
//   // Game settings
//   GAME: {
//     TICK_PERIOD: 1000 / 30, // <=> 30 FPS
//     SESSION_TIMEOUT: 5000, // 5s
//     MAX_SESSIONS: 100,
//   },
  
//   // Database settings
//   DB: {
//     PATH: process.env.DB_PATH || "/app/sessions/sessions.db",
//     ENABLE_WAL: true,
//   },
  
//   // Server settings
//   SERVER: {
//     PORT: parseInt(process.env.PORT || "3000"),
//     HOST: process.env.HOST || "0.0.0.0",
//   }
// } as const;