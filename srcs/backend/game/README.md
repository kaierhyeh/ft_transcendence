# Game Service

This service manages concurrent live Pong game sessions, match history, and provides a REST API and WebSocket interface for players and viewers.

## Features

- Server-side Pong game logic
- Supports multiple players (PvP, multi-player)
- Real-time game updates via WebSocket
- Player connections (registered, guest, or AI)
- Match history and session repository
- Simple API with pagination and filtering

---

## How to Connect

All routes are prefixed by `/api/game`.  
Example: `https://localhost:4443/api/game`

---

## API Endpoints

All endpoints are under the `/game` prefix:

### Live Game Routes

#### `POST /game/create`

Create a new game session [protected - internal service only].

**Note:** Game creation is typically handled through the matchmaking service, which provides JWT match tickets for players.

**Request Body:**
```json
{
  "mode": "pvp" | "multi",
  "participants": [
    {
      "player_id": number,
      "type": "registered" | "guest" | "ai",
      "team": "left" | "right",
      "slot": "left" | "right" | "top-left" | "bottom-left" | "top-right" | "bottom-right",
      "user_id"?: number
    }
  ]
}
```
- `mode`: Game mode
- `participants`: Array of 2-4 players

**Response:**
```json
{
  "game_id": number
}
```

---

#### `GET /game/:id/conf`

Get the configuration for a specific game session.

**Response:**
```json
{
  "canvas_height": number,
  "canvas_width": number,
  "paddle_height": number,
  "paddle_width": number,
  "win_point": number,
  "ball_size": number
}
```

---

#### `GET /game/:id/ws`

Establish a WebSocket connection for real-time game updates.

- **Players**: Join and send input
- **Viewers**: Subscribe to game state updates

---

### Match History Routes

#### `GET /game/sessions`

Get match history with pagination and filtering [protected - internal service only].

**Query Parameters:**

| Parameter | Type   | Required | Description                                                 |
| --------- | ------ | -------- | ----------------------------------------------------------- |
| `page`    | number | optional | Default `1`.                                                |
| `limit`   | number | optional | Default `10`, max `20`.                                     |
| `user_id` | number | optional | Filter to sessions that include a specific registered user. |

**Examples:**
```
GET /game/sessions?page=1&limit=10
GET /game/sessions?user_id=7&page=3
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

---

## WebSocket Protocol

All messages are JSON objects. WebSocket connections require JWT authentication for players.

### Client → Server

#### **Join Game (Players)**
```json
{
  "type": "join",
  "ticket": "<jwt_game_session_token>"
}
```
- Requires a valid JWT game session token (provided by matchmaking service)
- JWT must contain `game_id` matching the WebSocket endpoint

#### **Send Input (Players)**
```json
{
  "type": "input",
  "move": "up" | "down" | "stop"
}
```
- Only available after successful join with valid JWT

#### **View Game (Viewers)**
```json
{
  "type": "view"
}
```
- No authentication required for viewers

### Server → Client

#### **Game State Update**
```json
{
  "type": "game_state",
  "ball": {
    "x": number,
    "y": number,
    "dx": number,
    "dy": number
  },
  "players": {
    "left": { "slot": "left", "paddle": {"x": number, "y": number}, "velocity": number, "connected": boolean, "team": "left" },
    "right": { ... }
  },
  "score": {
    "left": number,
    "right": number
  },
  "winner": "left" | "right" | undefined
}
```

---

## Authentication & Flow

1. **Game Creation**: Games are created through the matchmaking service (not directly)
2. **JWT Tickets**: Matchmaking provides JWT game session tokens to players
3. **Player Connection**: Players use JWT tickets to join specific game sessions via WebSocket
4. **Viewer Access**: Viewers can connect without authentication to watch games

## Development Notes

- Modular codebase: `src/db`, `src/game`, `src/routes`, `src/types`
- Repository pattern for DB access
- All routes under `/game` prefix: live sessions and match history
- JWT-based authentication for player connections
