# Matchmaking Service

This service handles game matchmaking, creates game sessions, and provides JWT game tickets for players to connect to live games.

## Features

- Game session creation (PvP and multi-player)
- JWT game ticket generation for secure player authentication
- Integration with Game and Auth services
- Support for registered users, guests, and AI players
- Automatic team and slot assignment for multiplayer games

---

## How to Connect

All routes are prefixed by `/api/match`.  
Example: `https://localhost:4443/api/match`

---

## API Endpoints

### Matchmaking Routes

#### `POST /match/make`

Create a new match and game session with JWT tickets for players.

**Request Body:**
```json
{
  "mode": "pvp" | "multi",
  "participants": [
    {
      "type": "registered" | "guest" | "ai",
      "user_id"?: number
    }
  ]
}
```
- `mode`: Game mode (pvp for 2 players, multi for 4 players)
- `participants`: Array of 2-4 participants depending on mode
- `user_id`: Required for registered users, optional for guests/AI

**Response:**
```json
{
  "game_id": number,
  "jwt_tickets": [
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  ]
}
```
- `game_id`: The created game session ID
- `jwt_tickets`: Array of JWT tokens for each participant (same order as participants)

---

## Game Modes

### PvP Mode
- **Participants**: Exactly 2 players
- **Team Assignment**: Player 1 → left team, Player 2 → right team
- **Slot Assignment**: Player 1 → left slot, Player 2 → right slot

### Multi Mode
- **Participants**: Exactly 4 players
- **Team Assignment**: Players 1-2 → left team, Players 3-4 → right team
- **Slot Assignment**: 
  - Player 1 → top-left
  - Player 2 → bottom-left
  - Player 3 → top-right
  - Player 4 → bottom-right

---

## JWT Game Tickets

Each participant receives a JWT token containing:
```json
{
  "type": "GAME_SESSION",
  "sub": "player_id",
  "game_id": number,
  "iat": timestamp,
  "exp": timestamp,
  "iss": "auth_service"
}
```

These tokens are used to:
1. **Authenticate with the Game service WebSocket**
2. **Join the specific game session**
3. **Verify player identity during gameplay**

---

## Example Usage

### Create PvP Match
```bash
POST /api/match/make
{
  "mode": "pvp",
  "participants": [
    {
      "type": "registered",
      "user_id": 123
    },
    {
      "type": "ai"
    }
  ]
}
```

### Create Multi-player Match
```bash
POST /api/match/make
{
  "mode": "multi",
  "participants": [
    {
      "type": "registered",
      "user_id": 123
    },
    {
      "type": "registered", 
      "user_id": 456
    },
    {
      "type": "guest",
      "user_id": 789
    },
    {
      "type": "ai"
    }
  ]
}
```

---

## Development Notes

- Modular architecture with clients for external service communication
- JWT-based security for game session authentication
- Automatic player ID assignment (sequential: 1, 2, 3, 4)
- Team balancing for multiplayer games
- Error handling with specific HTTP status codes
- Internal authentication for service-to-service calls
