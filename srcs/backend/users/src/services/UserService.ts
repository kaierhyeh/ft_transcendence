import { GameClient, SessionsPayload } from '../clients/GameClient';
import { LiteStats, StatsClient, LeaderboardEntry } from '../clients/StatsClient';
import { CONFIG } from '../config';
import { UpdateData, UserRepository, UserRow } from '../repositories/UserRepository';
import { Credentials, GoogleUserCreationData, LocalUserCreationRawData, PasswordUpdateData, UpdateRawData } from '../schemas';
import { hashPassword, verifyPassword } from '../utils/crypto';

export type UserProfile = Omit<UserRow, "password_hash" | "two_fa_secret" | "google_sub" | "avatar_filename"> & LiteStats & {
  avatar_url: string | null;
};

export type PublicProfile = Omit<UserProfile, "two_fa_enabled" | "updated_at">;

export interface LeaderboardEntryWithUsername {
  user_id: number;
  username: string;
  total_points_scored: number;
}

export class UserService {
  private statsClient: StatsClient;
  private gameClient: GameClient;

  constructor(
    private userRepository: UserRepository,
  ) {
    this.statsClient = new StatsClient();
    this.gameClient = new GameClient();
  }

  public async createLocalUser(data: LocalUserCreationRawData) {

    const password_hash = await hashPassword(data.password);

    const user_data = {
      username: data.username,
      email: data.email,
      password_hash,
      alias: data.username, // Default alias to username
    };

    const user_id = this.userRepository.createLocalUser(user_data);
    return { user_id };
  }

  public async createGoogleUser(data: GoogleUserCreationData) {
    const user_data = {
      google_sub: data.google_sub,
      username: data.username,
      email: data.email,
      alias: data.alias ?? data.username,
    };

    const user_id = this.userRepository.createGoogleUser(user_data);
    return { user_id };
  }

  public async resolveLocalUser(credentials: Credentials) {
    const user = await this.getUser(credentials.username);
    if (user.google_sub) {
      const error = new Error('Not a local user');
      (error as any).code = 'NOT_A_LOCAL_USER';
      throw error;
    }
    if (!user.password_hash) {
     throw new Error("No password hash for local user"); 
    }
    const valid = await verifyPassword(credentials.password, user.password_hash)
    if (!valid) {
      const error = new Error('Invalid credentials');
      (error as any).code = 'INVALID_CREDENTIALS';
      throw error;
    }
    return user;
  }

  public async getUser(identifier: string): Promise<UserRow> {
    const user = await this.userRepository.find(String(identifier));
    if (!user) {
      const error = new Error('User not found');
      (error as any).code = 'USER_NOT_FOUND';
      throw error;
    }
    return user;
  }

  public async getUserByGoogleSub(google_sub: string): Promise<UserRow> {
    const user = await this.userRepository.findByGoogleSub(google_sub);
    if (!user) {
      const error = new Error('User not found');
      (error as any).code = 'USER_NOT_FOUND';
      throw error;
    }
    return user;
  }

  public async getProfile(user_id: number): Promise<UserProfile> {
    const user = await this.getUserById(user_id);
    
    let lite_stats: LiteStats;
    try {
      lite_stats = await this.statsClient.getLiteStats(user_id);
    } catch (error: any) {
      // If stats not found (404), return default stats (all zeros)
      if (error.status === 404) {
        lite_stats = {
          wins: 0,
          losses: 0,
          curr_winstreak: 0,
          best_winstreak: 0,
          total_points_scored: 0
        };
      } else {
        throw error; // Re-throw other errors
      }
    }
    
    const { password_hash, two_fa_secret, google_sub, avatar_filename, ...cleanUser } = user;
    
    return {
      ...cleanUser,
      avatar_url: avatar_filename ?
        `api/users/${user.user_id}/avatar` :
        null,
      ...lite_stats
    };
  }

  public async getPublicProfile(user_id: number): Promise<PublicProfile> {
    const userProfile = await this.getProfile(user_id);
    const { two_fa_enabled, updated_at, ...publicProfile } = userProfile;
    
    return publicProfile;
  }

  public async getAvatar(user_id: number): Promise<string> {
    const { avatar_filename } = await this.getUserById(user_id);
  
    return avatar_filename;
  }

  public async updateUser(user_id: number, raw_data: UpdateRawData): Promise<number> {
    // Transform raw user input to database format
    const data: UpdateData = {
      alias: raw_data.alias,
      settings: raw_data.settings,
      // Extract just the hash string from the auth service response
      password_hash: raw_data.password ? await this.updatePassword(user_id, raw_data.password) : undefined,
    };

    const changes = this.userRepository.updateById(user_id, data);

    return changes;
  }

  public async updateAvatar(user_id: number, filename: string, updated_at: string): Promise<number> {
    const data: UpdateData = {
      avatar: { filename, updated_at }
    };
    const changes = this.userRepository.updateById(user_id, data);
    return changes;
  }

  private async updatePassword(user_id: number, password: PasswordUpdateData): Promise<string> {

    const user = await this.getUserById(user_id);
    if (!user.password_hash) {
      const error = new Error('Forbidden operation: No existing password to update');
      (error as any).code = 'FORBIDDEN_OPERATION';
      throw error;
    }
    const valid = await verifyPassword(password.old, user.password_hash);
    if (!valid) {
      const error = new Error('Invalid credentials');
      (error as any).code = 'INVALID_CREDENTIALS';
      throw error;
    }
    return await hashPassword(password.new);
  } 

  public async getUserById(id: number): Promise<UserRow> {
    const user = this.userRepository.findById(id);
    if (!user) {
      const error = new Error('User not found');
      (error as any).code = 'USER_NOT_FOUND';
      throw error;
    }
    return user;
  }


  public async getLeaderboard(limit: number = 10): Promise<LeaderboardEntryWithUsername[]> {
    const leaderboardEntries = await this.statsClient.getLeaderboard(limit);
    
    const leaderboardWithUsernames: LeaderboardEntryWithUsername[] = [];
    for (const entry of leaderboardEntries) {
      try {
        const user = await this.userRepository.findById(entry.user_id);
        if (user && user.username) {
          leaderboardWithUsernames.push({
            user_id: entry.user_id,
            username: user.username,
            total_points_scored: entry.total_points_scored
          });
        }
      } catch (error) {
        continue;
      }
    }
    
    return leaderboardWithUsernames;
  }

  public async resetAvatarToDefault(userId: number): Promise<number> {
    return this.userRepository.resetAvatarToDefault(userId);
  }

  public async getMatchHistory(user_id: number, page: number, limit: number): Promise<SessionsPayload> {
    return this.gameClient.getMatchHistory(user_id, page, limit);
  }

  public async update2FASettings(user_id: number, enabled: number, secret?: string | null): Promise<void> {
    this.userRepository.update2FASettings(user_id, enabled, secret);
  }
}