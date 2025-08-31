## Directory structure

- `game/`
  - `src/`
    - `db/`
    - `game/`
        - *GameSession.ts*
        - *GameEngine.ts*
    - `routes/`
    - `schemas/`
    - `types/`
    - `websockets/`
    - `server/`
    - *index.ts*
  - *package-lock.json*
  - *package.json*
  - *tsconfig.json*
- *README.md*
- *.dockerignore*
- *Dockerfile*

## Types
*Those types mostly defines data carriers*
- PublicGameState:
    - ball


## Class structure

### GameState

**public**
- `constructor` **GameState()**
- **toPublic():** `PublicGameState`

**private**
- **last_connection_time_**: `number`;
- **ball_**: `Ball`;
- **websockets_**: `Set(SocketStream)`
  left_team: TeamState;
  right_team: TeamState;
  websockets: Set<SocketStream>;
  ongoing: boolean;


### GameSession

**public**
- `constructor` **GameSession**(type: GameType, participants: GameParticipants)
- **dump()**: boolean // save sessions in db sessions

**private**
- **type_**: `GameType`
- **participants_**: `GameParticipants`
- `conf_: GameConf`
- **state**: `GameState`
- **created_at_**: `Date`
- **started_at_**: `Date`
- **ended_at_**: `Date`
  winner_id: number | undefined;


### GameEngine

**public**
- `constructor` **GameEngine()**
- **moveBall**(game_state: GameState)
- **resetBall**(game_state: GameState)
- **movePaddle**(player_input: PlayerInput, game_state: GameState)

**private**
 - ...

### GameSessionManager
**public**
- `constructor` **GameSessionManager()**
- **createGameSession**(type: GameType, participants: GameParticipants): `number` *// used by /game/create*
- **deleteGameSession**(id: number)
- **saveGameSession**(id: number)
- **joinGameSession**(id: number) *// used by /game/:id/join*
- **getGameSessionConf**(id: number) *// used by /game/:id/conf*

**private**
- **game_engine_**: `GameEngine`
- **game_sessions_**: `Map<number, GameSession>`
- **db_**: `Db`

