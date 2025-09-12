# Game Service

This service manages concurrent live Pong game sessions, match history, and provides a REST API and WebSocket interface for players and viewers.

## Features

- Server-side Pong game logic
- Supports multiple players (PvP, tournament, multi)
- Real-time game updates via WebSocket
- Player and viewer connections (local, remote, or AI)
- Match history and session repository
- Extensible API with pagination, filtering, and sorting

---

## How to Connect

All routes are prefixed by `/api/game`.  
Example: `https://localhost:4443/api/game`

---

## API Endpoints

### Live Game

#### `POST /game/create`

Create a new game session.

**Request Body:**
```json
{
  "type": "pvp" | "tournament" | "multi",
  "participants": [
    { "user_id": number, "participant_id": string },
    ...
  ]
}
```
- `type`: Game mode
- `participants`: Array of 2-4 players, each with a unique `user_id` and `participant_id`

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

## WebSocket Protocol

All messages are JSON objects.  
Below are the supported message types:

### Client → Server

#### **Join Game**
```json
{
  "type": "join",
  "participant_id": "string"
}
```
- Used by players to join a game session using their participant id.

#### **Send Input**
```json
{
  "type": "input",
  "participant_id": "string",
  "move": "up" | "down" | "stop"
}
```
- Used by players to send paddle movement input.

#### **View Game**
```json
{
  "type": "view"
}
```
- Used by viewers to subscribe to game state updates.

---

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
    "left": {
      "slot": "left",
      "paddle": {x: number, y: number},
      "velocity": number,
      "connected": boolean,
      "team": "left"
    },
    "right": { ... },
    "bottom-left": { ... },
    "bottom-right": { ... },
    "top-left": { ... },
    "top-right": { ... }
  },
  "score": {
    "left": number,
    "right": number
  },
  "winner": "left" | "right" | undefined
}
```
- Sent periodically to all connected players and viewers.

---

## Match History & Repository Pattern

The service uses a repository pattern for database access:

- **SessionRepository**: Handles saving, finding, and querying game sessions and player sessions.

### Example Query Parameters for History Endpoints

```
?page=1&limit=10&sort=created_at&order=desc&type=pvp&player_id=123
```
- `page`, `limit`: Pagination
- `sort`, `order`: Sorting
- `type`: Filter by game type
- `player_id`: Filter by player

---

## Database Schema

- **sessions**: Stores game session metadata
- **player_sessions**: Stores per-player session data

---

## Development Notes

- Modular codebase: `src/db`, `src/game`, `src/routes`, `src/types`
- Repository pattern for DB access
- Extensible for more game modes and features

---

## Contributing

- See `src/types/` for shared interfaces
- See `src/routes/` for API endpoints
- See `src/game/` for game logic and session management
- See `src/db/` for database and repository code
