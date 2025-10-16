import { AuthClient, GameSessionClaims } from '../clients/AuthClient';
import { GameClient, GameCreationData, Player } from '../clients/GameClient';
import { UsersClient } from '../clients/UsersClient';
import { MatchMakingData } from '../schemas';

type Team = "left" | "right";
type PlayerSlots = "left" | "right" | "top-left" | "bottom-left" | "top-right" | "bottom-right";

export interface Match {
  game_id: number;
  jwt_tickets: string[];
}

export class MatchMakingService {
  private authClient: AuthClient;
  private gameClient: GameClient;
  private usersClient: UsersClient;

  constructor(
  ) {
    this.authClient = new AuthClient();
    this.gameClient = new GameClient();
    this.usersClient = new UsersClient();
  }

  public async make(data: MatchMakingData): Promise<Match> {
    if (data.format === "2v2") {
      return this.make2v2Game(data);
    } 
    return this.make1v1Game(data);
  }

  private async make1v1Game(data: MatchMakingData): Promise<Match> {
    // Map participants to game players for game creation
    const players: Player[] = await Promise.all(
      data.participants.map(async (participant, index) => {
        const username = participant.user_id 
          ? (await this.usersClient.getUserName(participant.user_id)).username 
          : undefined;

        return {
          player_id: index + 1, // Sequential player IDs
          team: index % 2 === 0 ? "left" as Team : "right" as Team, // Alternate teams (player vs AI)
          slot: index % 2 === 0 ? "left" as PlayerSlots : "right" as PlayerSlots, // Match slots to teams
          user_id: participant.user_id,
          username,
          type: participant.type // Include the participant type
        };
      })
    );

    const game_creation_data: GameCreationData = {
      format: data.format,
      mode: data.mode,
      online: data.online,
      tournament_id: data.tournament_id,
      players
    };

    // Create game first to get game_id
    const game_id = await this.gameClient.createGame(game_creation_data);

    // Generate JWT tickets for each participant using the game_id
    const jwt_tickets = await Promise.all(
      data.participants.map(async (participant, index) => {
        const player_id = index + 1;       
        
        const claims: GameSessionClaims = {
          sub: `${player_id}`,
          game_id: game_id,
        };
        const result = await this.authClient.generateJWT(claims);
        return result.token;
      })
    );

    return { game_id, jwt_tickets };
  }


  private async make2v2Game(data: MatchMakingData): Promise<Match> {
    // Validate we have exactly 4 participants for multi-player
    if (data.participants.length !== 4) {
      throw new Error(`Multi-player games require exactly 4 participants, got ${data.participants.length}`);
    }

    // Map participants to game players with specific team/slot assignments
    const players = await Promise.all(
      data.participants.map(async (participant, index) => {
        // Team assignment: first 2 players = "left", last 2 players = "right"
        const team: Team = index < 2 ? "left" : "right";
        
        // Slot assignment based on array order
        const slot: PlayerSlots = this.getMultiPlayerSlot(index);
        
        const username = participant.user_id 
          ? (await this.usersClient.getUserName(participant.user_id)).username 
          : undefined;
        
        return {
          player_id: index + 1,
          team,
          slot,
          user_id: participant.user_id,
          username,
          type: participant.type
        };
      })
    );

    const game_creation_data: GameCreationData = {
      format: data.format,
      mode: data.mode,
      online: data.online,
      players
    };

    // Create game first to get game_id
    const game_id = await this.gameClient.createGame(game_creation_data);

    // Generate JWT tickets for each participant using the game_id
    const jwt_tickets = await Promise.all(
      data.participants.map(async (participant, index) => {
        const player_id = index + 1;
        
        const claims: GameSessionClaims = {
          sub: `${player_id}`,
          game_id: game_id,
        };
        const result = await this.authClient.generateJWT(claims);
        return result.token;
      })
    );

    return { game_id, jwt_tickets };
  }

  // Get slot assignment for multi-player games based on array index
  private getMultiPlayerSlot(index: number): PlayerSlots {
    switch (index) {
      case 0: return "top-left";     // Player 1: top-left
      case 1: return "bottom-left";  // Player 2: bottom-left  
      case 2: return "top-right";    // Player 3: top-right
      case 3: return "bottom-right"; // Player 4: bottom-right
      default:
        throw new Error(`Invalid player index for multi-player: ${index}`);
    }
  }

}