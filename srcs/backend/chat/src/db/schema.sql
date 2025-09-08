-- the SQL script that defines  tables, indexes, relationships, etc.
-- can be in configs folder or in src

-- possible to add timestamp in both tables

CREATE TABLE IF NOT EXISTS chats (
	id INTEGER PRIMARY KEY AUTOINCREMENT,	-- chat id
	user_id_a INTEGER NOT NULL,				-- first user in chat
	user_id_b INTEGER NOT NULL,				-- second user in chat
	UNIQUE(user_id_a, user_id_b)			-- only uniq couples of users
);

CREATE TABLE IF NOT EXISTS messages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,							-- message id
	chat_id INTEGER NOT NULL,										-- chat id in the table "chats"
	from_id INTEGER NOT NULL,										-- who sent message
	to_id INTEGER NOT NULL,											-- who recived message
	msg INTEGER NOT NULL,											-- message
	FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE	-- delate messages with chat
);

-- this is a table of another microservice 
-- add as an example for getChatPartners() from chat.repository.ts
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,							-- user id
	nickname INTEGER NOT NULL,										-- user nickname
);
