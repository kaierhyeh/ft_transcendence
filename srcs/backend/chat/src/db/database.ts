// // connect to db and seed test data

// // driver to work with SQLite DB
// import sqlite3 from "sqlite3";
// // module to work with file pathes
// import path from "path";
// // module to work with file system
// import fs from "fs";
// import { colorLog, redLogError } from "../utils/logger";

// // path to SQL-schema and to database file
// const schemaPath	= path.resolve(__dirname, "schema.sql");
// const databasePath	= path.resolve(__dirname, "../db/data.sqlite");

// // try to connect with database
// const database = new sqlite3.Database(databasePath, (err) => {
// 	if (err) redLogError("Can not connect with database:", err);
// 	else initDatabase();
// });

// // try to initialize database
// function initDatabase() {
// 	colorLog("cyan", "Try to connect with DB");
// 	const schema = fs.readFileSync(schemaPath, "utf8");
// 	database.exec(schema, (err) => {
// 		if (err) redLogError("Can not initialize database:", err);
// 		else colorLog("green", "Database initialized");
// 	});
// 	// here we can add seed function to fill database with test data
// 	// but don't forget to comment seed function in the final project
// 	seedData();
// }

// function seedData() {
// 	// serialize - to run queries one by one
// 	database.serialize(() => {

// 		// seed users
// 		const users = [
// 			{ id: 1, username: "Alice", wins: 5, losses: 3 },
// 			{ id: 2, username: "Bob", wins: 2, losses: 4 },
// 			{ id: 3, username: "Charlie", wins: 3, losses: 3 },
// 			{ id: 4, username: "Diana", wins: 4, losses: 2 },
// 		];
// 		users.forEach((u) => {
// 			database.run(
// 				`INSERT INTO users (id, username, wins, losses)
// 				VALUES (?, ?, ?, ?)
// 				ON CONFLICT(id) DO NOTHING`,
// 				[u.id, u.username, u.wins, u.losses],
// 				function (err) {
// 					if (err) console.error("Error inserting user:", err.message);
// 					// else console.log(`Inserted user: ${u.id}`);
// 				}
// 			);
// 		});

// 		// seed chats
// 		const chats = [
// 			{ id: 1, user_id_a: 1, user_id_b: 2 }, // Alice & Bob
// 			{ id: 2, user_id_a: 3, user_id_b: 1 }, // Charlie & Alice
// 			{ id: 3, user_id_a: 2, user_id_b: 4 }, // Bob & Diana
// 		];
// 		chats.forEach((c) => {
// 			database.run(
// 				`INSERT INTO chats (id, user_id_a, user_id_b)
// 				VALUES (?, ?, ?)
// 				ON CONFLICT(user_id_a, user_id_b) DO NOTHING`,
// 				[c.id, c.user_id_a, c.user_id_b],
// 				function (err) {
// 					if (err) console.error("Error inserting chat:", err.message);
// 					// else console.log(`Inserted chat: ${c.id}`);
// 				}
// 			);
// 		});

// 		// seed messages
// 		const messages = [
// 			{ chat_id: 1, from_id: 1, to_id: 2, msg: "Hey Bob!" },
// 			{ chat_id: 1, from_id: 2, to_id: 1, msg: "Hey Alice, how are you?" },
// 			{ chat_id: 1, from_id: 1, to_id: 2, msg: "Doing great, thanks!" },

// 			{ chat_id: 2, from_id: 1, to_id: 3, msg: "Charlie, are you free tonight?" },
// 			{ chat_id: 2, from_id: 3, to_id: 1, msg: "Sure, let's play Pong." },

// 			{ chat_id: 3, from_id: 2, to_id: 4, msg: "Hi Diana, ready for the match?" },
// 			{ chat_id: 3, from_id: 4, to_id: 2, msg: "Absolutely!" },
// 		];
// 		messages.forEach((m) => {
// 			database.run(
// 				`INSERT INTO messages (chat_id, from_id, to_id, msg)
// 				VALUES (?, ?, ?, ?)
// 				`,
// 				[m.chat_id, m.from_id, m.to_id, m.msg],
// 				function (err) {
// 					if (err) console.error("Error inserting message:", err.message);
// 					// else console.log(`Inserted message: ${m.chat_id}`);
// 				}
// 			);
// 		});
// 	});
// }

// export default database;
