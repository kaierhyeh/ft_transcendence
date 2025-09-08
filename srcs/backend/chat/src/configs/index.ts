// application configuration — things like environment variables, ports, database paths, secrets, etc.

// example :

// import dotenv from "dotenv";
// import path from "path";

// // Load environment variables from .env file
// dotenv.config();

// export const config = {
//   app: {
//     port: process.env.PORT ? Number(process.env.PORT) : 3000,
//     env: process.env.NODE_ENV || "development",
//   },
//   db: {
//     sqlitePath: process.env.SQLITE_PATH || path.join(__dirname, "../../chat.db"),
//   },
//   auth: {
//     jwtSecret: process.env.JWT_SECRET || "supersecret",
//     tokenExpiry: "1h",
//   }
// };
