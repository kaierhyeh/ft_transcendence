// application configuration — things like environment variables, ports, database paths, secrets, etc.

// example :

export const CONFIG = {
	// Database settings
	DB: {
		PATH: process.env.DB_PATH || "/app/sessions/sessions.db",
		ENABLE_WAL: true,
	},

	// Server settings
	SERVER: {
		PORT: parseInt(process.env.PORT || "3001"),
		HOST: process.env.HOST || "0.0.0.0",
	},

	SECURITY: {
		JWT_SECRET: process.env.SECRET_JWT || "here-should-be-magic-secret-words",
	}
} as const;
