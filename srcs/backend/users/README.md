# User Management Service

This service manages user accounts, profiles, authentication data, and social features like friends and blocking. It provides a REST API for user CRUD operations, profile management, and social interactions.

## Features

- User account management (local, Google OAuth, guest users)
- Profile management with avatar and settings
- Social features: friends, blocking, friend requests
- Match history integration with game service
- Repository pattern with SQLite database
- JWT authentication middleware
- Type-safe schemas with validation

---

## How to Connect

Routes are distributed across different prefixes:
- **User management**: `/users` 
- **Friends management**: `/friends`
- **Block management**: `/blocks`

Example: `https://localhost:4443/users`, `https://localhost:4443/friends`

---

## API Endpoints

### User Management

#### `POST /users`

Create a new user account.

**Request Body:**
```json
{
  "type": "local" | "google" | "guest",
  // For local accounts:
  "username": "string",
  "email": "string", 
  "password_hash": "string",
  "alias": "string",
  "avatar_url": "string",
  // For Google accounts:
  "google_sub": "string",
  "username": "string",
  "email": "string",
  "alias": "string",
  "avatar_url": "string",
  // For guest accounts:
  "alias": "string"
}
```

**Response:**
```json
{
  "user_id": number
}
```

---

#### `GET /users/:login`

Get user data by login identifier (username, email, or Google sub).  
**[Internal service access only]**

**Response:**
```json
{
  "user_id": number,
  "username": "string",
  "email": "string",
  "password_hash": "string",
  "alias": "string",
  "avatar_url": "string",
  "user_type": "registered" | "guest" | "expired" | "deleted",
  "google_sub": "string",
  "two_fa_enabled": boolean,
  "two_fa_secret": "string",
  "settings": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

#### `PUT /users/me`

Update current user profile.  
**[Requires JWT authentication]**

**Request Body:**
```json
{
  "email": "string",
  "password_hash": "string",
  "alias": "string", 
  "avatar_url": "string",
  "settings": "string",
  "two_fa_enabled": boolean,
  "two_fa_secret": "string"
}
```

---

#### `GET /users/me`

Get current user profile with sensitive data.  
**[Requires JWT authentication]**

**Response:**
```json
{
  "user_id": number,
  "username": "string",
  "email": "string",
  "alias": "string",
  "avatar_url": "string",
  "user_type": "string",
  "two_fa_enabled": boolean,
  "settings": "string",
  "stats": {
    // TODO: Game statistics summary
  }
}
```

---

#### `GET /users/id/:id`

Get public user profile (no sensitive data).

**Response:**
```json
{
  "user_id": number,
  "username": "string",
  "alias": "string",
  "avatar_url": "string",
  "stats": {
    // TODO: Game statistics summary
  }
}
```

---

#### `GET /users/match-history`

Get match history for current user via game service integration.  
**[Requires JWT authentication]**

---

### Friends Management

#### `GET /friends`

List current friends.  
**[Requires JWT authentication]**

#### `GET /friends/pending`

List pending friend requests (incoming/outgoing).  
**[Requires JWT authentication]**

#### `POST /friends/request/:id`

Send a friend request to user.  
**[Requires JWT authentication]**

#### `DELETE /friends/request/:id`

Cancel a friend request.  
**[Requires JWT authentication]**

#### `POST /friends/accept/:id`

Accept a friend request.  
**[Requires JWT authentication]**

#### `POST /friends/decline/:id`

Decline a friend request.  
**[Requires JWT authentication]**

#### `DELETE /friends/:id`

Remove a friend.  
**[Requires JWT authentication]**

---

### Block Management

#### `GET /blocks`

List blocked users.  
**[Requires JWT authentication]**

#### `POST /blocks/:id`

Block a user.  
**[Requires JWT authentication]**

#### `DELETE /blocks/:id`

Unblock a user.  
**[Requires JWT authentication]**

#### `POST /blocks/check`

Check if user is blocked (internal service endpoint).  
**[Requires internal service authentication]**

**Request Body:**
```json
{
  "user_id": number,
  "target_id": number
}
```

---

## Database Schema

### Users Table
```sql
users (
  user_id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  alias TEXT,
  avatar_url TEXT,
  user_type TEXT CHECK(user_type IN ('registered', 'guest', 'expired', 'deleted')),
  google_sub TEXT UNIQUE,
  two_fa_enabled BOOLEAN DEFAULT 0,
  two_fa_secret TEXT,
  settings TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Additional Tables
- **friendships**: Friend relationships (see `src/sql/friendships.sql`)
- **user_blocks**: User blocking relationships (see `src/sql/user_blocks.sql`)

---

## Service Structure

```
src/
├── clients/              # External service clients
│   ├── AuthClient.ts
│   └── StatsClient.ts
├── config.ts             # Service configuration
├── controllers/          # Request handlers and business ----- logic ---
│   ├── BlockController.ts
│   ├── FriendController.ts
│   └── UserController.ts
├── middleware/           # Authentication and validation
│   └── verifyJWT.ts
├── plugins/              # Fastify plugins setup
│   ├── jwt.ts
│   ├── repositories.ts
│   └── services.ts
├── repositories/         # Data access layer
│   ├── BlockRepository.ts
│   ├── FriendRepository.ts
│   ├── UserRepository.ts
│   └── index.ts
├── routes/               # API route definitions
│   ├── blocks.ts
│   ├── friends.ts
│   ├── users.ts
│   └── index.ts
├── schemas/              # Input validation schemas
│   ├── blocks.ts
│   ├── friends.ts
│   ├── users.ts
│   └── index.ts
├── services/             # Business logic layer
│   ├── BlockService.ts
│   ├── FriendService.ts
│   └── UserService.ts
├── sql/                  # SQL scripts and schema
│   ├── friendships.sql
│   ├── user_blocks.sql
│   └── users.sql
├── types/                # TypeScript type definitions
│   └── index.ts
├── utils/                # Utility functions
│   ├── database.ts
│   ├── validation.ts
│   └── index.ts
└── index.ts              # Service entry point
```

### Architecture Pattern

The service follows a **layered architecture**:

1. **Routes** (`src/routes/`) - HTTP endpoints and request routing
2. **Controllers** (`src/controllers/`) - Request handling and response formatting
3. **Services** (`src/services/`) - Business logic and orchestration
4. **Repositories** (`src/repositories/`) - Data access and database operations
5. **Schemas** (`src/schemas/`) - Input validation and type safety

### Key Components

- **UserRepository/Service/Controller**: Handles all user account operations
- **FriendRepository/Service/Controller**: Manages friend relationships and requests
- **BlockRepository/Service/Controller**: Handles user blocking functionality
- **AuthClient**: Communicates with authentication service
- **StatsClient**: Integrates with game service for user statistics
- **JWT Middleware**: Authentication verification for protected routes
- **Fastify Plugins**: Modular setup for repositories, services, and JWT
- **Elementary Schemas**: Reusable field validation building blocks

---

## Development Notes

- **Type Safety**: Full TypeScript with schema validation using `json-schema-to-ts`
- **Database**: SQLite with better-sqlite3 for high performance
- **Repository Pattern**: Clean separation between business logic and data access
- **Modular Design**: Clear separation of concerns across layers
- **Plugin Architecture**: Fastify plugins for clean service initialization
- **External Clients**: AuthClient and StatsClient for microservice communication
- **Utilities**: Database helpers and validation utilities
- **Multiple Schemas**: Separate validation for users, friends, and blocks
- **JWT Integration**: Secure authentication for protected endpoints

---

## Authentication Flow

1. **User Creation**: Auth service calls `POST /users` to create user data
2. **Login**: Auth service calls `GET /users/:login` to retrieve user for validation
3. **Protected Routes**: JWT middleware verifies tokens before accessing user data

---

## Contributing

- See `src/types/` for shared TypeScript interfaces
- See `src/schemas/` for input validation schemas (users, friends, blocks)
- See `src/repositories/` for database operations
- See `src/routes/` for API endpoint definitions
- See `src/clients/` for external service integration
- See `src/utils/` for utility functions
- Follow the repository pattern for new features
- Use elementary schemas for field validation consistency
- Add new plugins in `src/plugins/` for service initialization

