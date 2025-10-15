-- the SQL script that defines  tables, indexes, relationships, etc.
-- can be in configs folder or in src

-- possible to add timestamp in both tables

CREATE TABLE IF NOT EXISTS chats (
	id INTEGER PRIMARY KEY AUTOINCREMENT,	-- chat id
	user_id_a INTEGER NOT NULL,				-- first user in chat
	user_id_b INTEGER NOT NULL,				-- second user in chat
	-- UNIQUE(user_id_a, user_id_b),			-- only unique pairs of users

	CONSTRAINT no_self_chat CHECK (user_id_a <> user_id_b)
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_user_pair
ON chats(
	CASE WHEN user_id_a < user_id_b THEN user_id_a ELSE user_id_b END,
	CASE WHEN user_id_a < user_id_b THEN user_id_b ELSE user_id_a END
);

CREATE TABLE IF NOT EXISTS messages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,							-- message id
	chat_id INTEGER NOT NULL,										-- chat id in the table "chats"
	from_id INTEGER NOT NULL,										-- who sent the message
	to_id INTEGER NOT NULL,											-- who received the message
	msg TEXT NOT NULL,												-- message
	blocked BOOLEAN DEFAULT 0,										-- 1 if the message was sent while the recipient has blocked the sender
	FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,	-- delete messages when chat is deleted

	CONSTRAINT no_self_message CHECK (from_id <> to_id)
);

-- this is a table of another microservice 
-- add as an example for getChatPartners() from chat.repository.ts
-- CREATE TABLE IF NOT EXISTS users (
-- 	id INTEGER PRIMARY KEY AUTOINCREMENT,							-- user id
-- 	username TEXT NOT NULL,											-- user username
-- 	wins INTEGER DEFAULT 0,											-- user wins
-- 	losses INTEGER DEFAULT 0										-- user losses
-- );
