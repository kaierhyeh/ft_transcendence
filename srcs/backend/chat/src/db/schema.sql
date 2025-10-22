-- Existing chats empty or not
CREATE TABLE IF NOT EXISTS chats (
	id INTEGER PRIMARY KEY AUTOINCREMENT,	-- chat id
	user_id_a INTEGER NOT NULL,				-- first user in chat
	user_id_b INTEGER NOT NULL,				-- second user in chat

	CONSTRAINT no_self_chat CHECK (user_id_a <> user_id_b)
);

-- Only unique pairs in chats table
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_pair
ON chats(
	CASE WHEN user_id_a < user_id_b THEN user_id_a ELSE user_id_b END,
	CASE WHEN user_id_a < user_id_b THEN user_id_b ELSE user_id_a END
);

-- Messages from user to user
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
