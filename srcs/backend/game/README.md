**⚠️ Disclaimer: the structure decribed below is already obselete. I will update thhat README.nd when done with the refactoring**

## Directory structure

- `game/`
  - `src/`
    - `db/`
    - `game/`
        - *GameSession.ts*
        - *GameEngine.ts*
        - *GameState.ts*
        - *index.ts* *// re-export*
    - `routes/`                           
        - *sessions.ts*
        - *game.ts*
        - *index.ts* *// re-export*
    - `schemas/`
    - `types/`
        - *game.ts*
        - *messages.ts*
        - *index.ts* *// re-export*
    - `websockets/`
        - *ConnectionManager.ts*
        - *MessageHandler.ts*
        - *index.ts* *// re-export*
    - `server/`
        - *Server.ts*
        - *index.ts* *// re-export*
    - *index.ts*
  - *package-lock.json*
  - *package.json*
  - *tsconfig.json*
- *README.md*
- *.dockerignore*
- *Dockerfile*

## Types
*Those types mostly defines data carriers*
- Score:
    - left: number
    - right: number
- Move = "up" | "down"
- PlayerSlot = "left" | "right" | "top-left" | "bottom-left" | "top-right" | "bottom-right"
- PublicPlayerState:
  - player_id: number
  - paddle_coord: number
- PublicGameState:
    - ball: Ball
    - players: Map<PlayerSlot, PublicPlayerState> // will be transformed into an object
    - score: Score


## Class structure

### GameState
*Carries live data about the game states (paddle coordinates, etc.). Provides a way to share sanitized state of the game to clients*

**public**
- `constructor` **GameState()**
- **toPublic():** `PublicGameState`
- *2 approaches*:
    1. **timeout()**: boolean *// will use a CONNECTION_TIMEOUT static var from `Server`*
    2. 2 getters (I think it is the best):
        - `get` lastConnectionTime(): `number`
        - `get` liveConnectionsCount(): `number`
- `get` ball(): `Ball`
- **incrementScore**(slot: "left" | "right")
- **movePaddle**(player_slot: PlayerSlot, step: number)

**private**
- **type_**: `GameType`
- **last_connection_time_**: `number`
- **ball_**: `Ball`
- **websockets_**: `Set(SocketStream)`
- **players_**: Map<PlayerSlot, PlayerState>
- **score_**: Score
- **ongoing**: boolean


### GameSession
*Carries live data about session. Can dump data into the database*

**public**
- `constructor` **GameSession**(type: GameType, participants: GameParticipants)
- **dump**(db: Db): boolean // save sessions in db sessions
- `get` **conf()**: `GameConf`

**private**
- **conf_**: `GameConf` *//got from `GameEgine` via its getConf method*
- **state_**: `GameState`
- **created_at_**: `Date`
- **started_at_**: `Date`
- **ended_at_**: `Date`
  winner_id: number | undefined;


### GameEngine
*Handles game physics. Adapts to gameplay mode (2 players, 4 players) by itself or maybe via derived class or whatever*

*needs its own clock*

**public**
- `constructor` **GameEngine()**
- **moveBall**(game_state: GameState)
- **resetBall**(game_state: GameState)
- **movePaddle**(move: Move, player_slot: PlayerSlot, game_state: GameState)
- **getConf**(game_type: GameType): `GameConf`
- **toFreshState**(game_state: GameState)

**private**
 - *to the developer discretion...*

### Server
`Extends fastify`

*Iterates over live game sessions, provide endpoints to interact with live sessions, serves session history data*

**public**
- `constructor` **Server()** *// all set up before server listen happen here*
- **run()** *// starts listening

**private**
- *attributes*
    - **game_engine_**: `GameEngine`
    - **game_sessions_**: `Map<number, GameSession>`
    - **db_**: `Db`
- *methods*
    - **updateLiveSessions_()**
    - **createGameSession_**(type: GameType, participants: GameParticipants): `number` *// used by /game/create*
    - **deleteGameSession_**(game_id: number)
    - **saveGameSession_**(game_id: number)
    - **joinGameSession_**(game_id: number) *// used by /game/:id/join*
    - **getGameSessionConf_**(game_id: number) *// used by /game/:id/conf*
    - **processPlayerInput_** (game_id: number, player_input: PlayerInput) *// usede by /game/:id/ws*

### ConnectionManager

**public**

- **accept**(game_id: number): `boolean`
- **setupNewConnection**(game_id: number)
- **closeAllConnections**(code: number, reason: string)

**private**


### MessageHandler

**public**
- **handlePlayerInput**(input: PlayerInputMessage, game_session: GameSession)
- **broadcastMessage**(message: OutbondMessage, game_session: GameSession)

**private**

### Db

*Repository pattern*

- save
- findby ...
- ...


// Query parameters
?page=1&limit=10&sort=created_at&order=desc&type=pvp&player_id=123
