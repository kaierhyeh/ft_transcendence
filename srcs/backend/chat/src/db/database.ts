// connect to db and seed test data

// driver to work with SQLite DB
import sqlite3 from "sqlite3";
// module to work with file pathes
import path from "path";
// module to work with file system
import fs from "fs";
import { colorLog, redLogError } from "../utils/logger";

// path to SQL-schema and to database file
const schemaPath	= path.resolve(__dirname, "schema.sql");
const databasePath	= path.resolve(__dirname, "../db/data.sqlite");

// try to connect with database
const database = new sqlite3.Database(databasePath, (err) => {
	if (err) redLogError("Can not connect with database:", err);
	else initDatabase();
});

// try to initialize database
function initDatabase() {
	colorLog("cyan", "Try to connect with DB");
	const schema = fs.readFileSync(schemaPath, "utf8");
	database.exec(schema, (err) => {
		if (err) redLogError("Can not initialize database:", err);
		else colorLog("green", "Database initialized");
	});
	// here we can add seed function to fill database with test data
	// but don't forget to comment seed function in the final project
	// seedData();
}

function seedData() {
	// serialize - to run queries one by one
	database.serialize(() => {
		// example:

		// database.run(
		// 	`INSERT INTO tablename (colomn1, colomn2, ...)
		// 	VALUES (?, ?, ...)
		// 	ON CONFLICT (colomn1, colomn2, ...) DO NOTHING`,
		// 	[1, 2, ...],
		// 	function (err) {
		// 		if (err) redLogError(err);
		// 		else console.log("Log text");
		// 	}
		// )

	})
}

export default database;
