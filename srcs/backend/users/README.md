# User Service

This service manages user accounts, profiles, authentication data, and social features like friends and blocking.

## Features

- User account management (local and Google OAuth)
- Profile management with avatar and settings
- Social features: friends, blocking, friend requests
- Match history integration with game service
- JWT authentication middleware
- Type-safe schemas with validation

---

## How to Connect

Routes are distributed across different prefixes:
- **User management**: `/users` 
- **Friends management**: `/friends`
- **Block management**: `/blocks`

All the prefixes above are under the main API prefix `/api`.

Example: `https://localhost:4443/api/users`, `https://localhost:4443/api/friends`

---

## API Endpoints

### User Management

#### `POST /users/local`

Create a new local user account (email/password signup) [protected - internal service only].

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "alias"?: "string"
}
```

**Response:**
```json
{
  "success": true,
  "user_id": number,
  "message": "Local user created successfully"
}
```

---

#### `POST /users/google`

Create a new Google OAuth user account [protected - internal service only].

**Request Body:**
```json
{
  "google_sub": "string",
  "username": "string",
  "email": "string",
  "alias"?: "string"
}
```

**Response:**
```json
{
  "success": true,
  "user_id": number,
  "message": "Google user created successfully"
}
```

---

#### `POST /users/local/resolve`

Resolve and authenticate local user credentials [protected - internal service only].

**Request Body:**
```json
{
  "login": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "user_id": number,
  "two_fa_enabled": boolean,
  "message": "Local user resolved successfully"
}
```

---

#### `GET /users/:identifier`

Get user data by an identifier (user_id, username, email) [protected - internal service only].

**Response:**
```json
{
  "user_id": number,
  "username": "string",
  "email": "string",
  "password_hash": "string",
  "alias": "string",
  "avatar_filename": "string",
  "status": "online" | "offline" | "away" | "deleted",
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

Update current user profile [requires user authentication].

**Request Body:**
```json
{
  "password"?: {
    "old": "string",
    "new": "string"
  },
  "alias"?: "string",
  "settings"?: "string",
  "two_fa_enabled"?: boolean
}
```

**Response:**
```json
{
  "changes": number
}
```

---

#### `PUT /users/me/avatar`

Update user avatar [requires user authentication].

**Request:** Multipart form data with image file

**Response:**
```json
{
  "changes": number
}
```

---

#### `GET /users/me`

Get current user profile with sensitive data [requires user authentication].

**Response:**
```json
{
  "user_id": number,
  "username": "string",
  "email": "string",
  "alias": "string",
  "status": "string",
  "two_fa_enabled": boolean,
  "settings": "string",
  "avatar_url": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "wins": number,
  "losses": number,
  "curr_winstreak": number,
  "best_winstreak": number,
  "total_games": number
}
```

---

#### `DELETE /users/me`

Delete current user account (soft delete) [requires user authentication].

**Response:**
```json
{
  "success": true,
  "changes": number,
  "message": "User account successfully deleted"
}
```

---

#### `DELETE /users/me/avatar`

Reset avatar to default [requires user authentication].

**Response:**
```json
{
  "success": true,
  "changes": number,
  "message": "Avatar reset to default successfully"
}
```

---

#### `GET /users/:uid/avatar`

Retrieve avatar image file.

**Response:** Image file (JPEG, PNG, GIF, WebP)

---

#### `GET /users/:uid/profile`

Get public user profile (no sensitive data).

**Response:**
```json
{
  "user_id": number,
  "username": "string",
  "alias": "string",
  "status": "string",
  "avatar_url": "string",
  "created_at": "datetime",
  "wins": number,
  "curr_winstreak": number,
  "best_winstreak": number,
  "losses": number,
  "total_games": number
}
```

---

#### `GET /users/:uid/match-history`

Get user's match history from game service [requires user authentication].

**Query Parameters:**

| Parameter | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| `page`    | number | optional | Default `1`.                    |
| `limit`   | number | optional | Default `10`, max `20`.         |

**Examples:**
```
GET /users/42/match-history
GET /users/42/match-history?page=1
GET /users/42/match-history?page=2&limit=5
```

**Response:**
```json
{
  "data": [
    {
      "id": number,
      "format": "1v1" | "2v2",
      "mode": "solo" | "pvp" | "tournament",
      "tournament_id": number | null,
      "forfeit": boolean,
      "created_at": "datetime",
      "started_at": "datetime",
      "ended_at": "datetime",
      "players": [
        {
          "user_id": number | null,
          "username": "string" | null,
          "type": "registered" | "guest" | "ai",
          "team": "left" | "right",
          "score": number,
          "winner": 0 | 1
        },
        ...
      ]
    },
    ...
  ],
  "pagination": {
    "page": number,
    "limit": number,
    "total_records": number,
    "total_pages": number,
    "next_page": number | null,
    "prev_page": number | null
  }
}
```

---

### Friends Management

#### `GET /friends`

List current user's friends [requires user authentication].

**Response:**
```json
{
  "friends": [
    {
      "user_id": number,
      "username": "string",
      "alias": "string",
      "status": "online" | "offline" | "away" | "deleted",
      "avatar_url": "string"
    },
    ...
  ]
}
```

---

#### `GET /friends/pending`

List pending friend requests (incoming/outgoing) [requires user authentication].

**Response:**
```json
{
  "incoming": [
    {
      "request_id": number,
      "user_id": number,
      "username": "string",
      "alias": "string",
      "avatar_url": "string",
      "created_at": "datetime"
    },
    ...
  ],
  "outgoing": [
    {
      "request_id": number,
      "user_id": number,
      "username": "string",
      "alias": "string",
      "avatar_url": "string",
      "created_at": "datetime"
    },
    ...
  ]
}
```

---

#### `POST /friends/request/:id`

Send a friend request to user [requires user authentication].

**Response:**
```json
{
  "success": true,
  "message": "Friend request sent"
}
```

---

#### `DELETE /friends/request/:id`

Cancel a friend request [requires user authentication].

**Response:**
```json
{
  "success": true,
  "message": "Friend request cancelled"
}
```

---

#### `POST /friends/accept/:id`

Accept a friend request [requires user authentication].

**Response:**
```json
{
  "success": true,
  "message": "Friend request accepted"
}
```

---

#### `POST /friends/decline/:id`

Decline a friend request [requires user authentication].

**Response:**
```json
{
  "success": true,
  "message": "Friend request declined"
}
```

---

#### `DELETE /friends/:id`

Remove a friend [requires user authentication].

**Response:**
```json
{
  "success": true,
  "message": "Friend removed"
}
```

---

### Block Management

#### `GET /blocks`

List blocked users [requires user authentication].

**Response:**
```json
{
  "blocked": [
    {
      "user_id": number,
      "username": "string",
      "alias": "string",
      "blocked_at": "datetime"
    },
    ...
  ]
}
```

---

#### `POST /blocks/:id`

Block a user [requires user authentication].

**Response:**
```json
{
  "success": true,
  "message": "User blocked"
}
```

---

#### `DELETE /blocks/:id`

Unblock a user [requires user authentication].

**Response:**
```json
{
  "success": true,
  "message": "User unblocked"
}
```

#### `POST /blocks/check`

Check if user is blocked [protected - internal service only].

**Request Body:**
```json
{
  "user_id": number,
  "target_id": number
}
```

---

## Service Integration

### Auth Service Integration
- **User Creation**: Called by auth service during signup
- **User Resolution**: Called by auth service during login
- **2FA Management**: Coordinated with auth service

### Stats Service Integration  
- **User Statistics**: Retrieves game stats for user profiles
- **Match History**: Fetches user's game history

---


## Service Architecture

The service follows a **layered architecture pattern**:

- **Routes**: HTTP endpoints and request routing
- **Controllers**: Request handling and response formatting  
- **Services**: Business logic and orchestration
- **Repositories**: Data access and database operations
- **Schemas**: Input validation and type safety
- **Clients**: External service communication (Auth, Stats)
- **Middleware**: Authentication and authorization
- **Plugins**: Modular Fastify initialization

This architecture ensures clear separation of concerns, making the codebase maintainable and testable.

---

## Development Notes

- **Type Safety**: Full TypeScript with schema validation using `json-schema-to-ts`
- **Database**: SQLite with better-sqlite3 for high performance
- **Repository Pattern**: Clean separation between business logic and data access
- **Modular Design**: Clear separation of concerns across layers
- **External Clients**: AuthClient and StatsClient for microservice communication
- **JWT Authentication**: Secure authentication for protected endpoints
- **Avatar Management**: File upload/download with automatic cleanup
- **Soft Delete**: User accounts are marked as deleted, not physically removed

