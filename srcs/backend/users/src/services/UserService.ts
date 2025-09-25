import { AuthClient } from '../clients/AuthClient';
import { LiteStats, StatsClient } from '../clients/StatsClient';
import { CONFIG } from '../config';
import { UpdateData, UserRepository, UserRow } from '../repositories/UserRepository';
import { GoogleUserCreationData, LocalUserCreationData, PasswordUpdateData, UpdateRawData } from '../schemas';

export type UserProfile = Omit<UserRow, "password_hash" | "two_fa_secret" | "google_sub"> & LiteStats;

export type PublicProfile = Omit<UserProfile, "email" | "two_fa_enabled" | "updated_at">;

export class UserService {
  private authClient: AuthClient;
  private statsClient: StatsClient;

  constructor(
    private userRepository: UserRepository,
  ) {
    this.authClient = new AuthClient();
    this.statsClient = new StatsClient();
  }

  public async createLocalUser(data: LocalUserCreationData) {
    const user_data = {
      username: data.username,
      email: data.email,
      password_hash: data.password_hash,
      alias: data.alias ?? data.username,
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

  

  public async getUserByLogin(login: string): Promise<UserRow> {
    const user = await this.userRepository.findByLogin(login);
    if (!user) {
      const error = new Error('User not found');
      (error as any).code = 'USER_NOT_FOUND';
      throw error;
    }
    return user;
  }

  public async getProfile(user_id: number): Promise<UserProfile> {
    const user = await this.getUserById(user_id);
    const lite_stats = await this.statsClient.getLiteStats(user_id);
    
    if (!lite_stats) {
      const error = new Error('Lite stats not found');
      (error as any).code = 'LITE_STATS_NOT_FOUND';
      throw error;
    }

    const { password_hash, two_fa_secret, google_sub, ...cleanUser } = user;
    
    return {
      ...cleanUser,
      avatar_filename: user.avatar_filename ?
        `${CONFIG.API.BASE_URL}/users/avatar/${user.avatar_filename}` :
        null,
      ...lite_stats
    };
  }

  public async getPublicProfile(user_id: number): Promise<PublicProfile> {
    const userProfile = await this.getProfile(user_id);
    const { email, two_fa_enabled, updated_at, ...publicProfile } = userProfile;
    
    return publicProfile;
  }

  public async updateUser(user_id: number, raw_data: UpdateRawData): Promise<number> {
    // Transform raw user input to database format
    const data: UpdateData = {
      email: raw_data.email,
      alias: raw_data.alias,
      settings: raw_data.settings,
      // Extract just the hash string from the auth service response
      password_hash: raw_data.password ? await this.updatePassword(user_id, raw_data.password) : undefined,
      // Extract the TwoFa object from the auth service response
      two_fa: raw_data.two_fa_enabled !== undefined ? await this.authClient.set2fa(raw_data.two_fa_enabled) : undefined
    };

    const changes = this.userRepository.updateById(user_id, data);

    return changes;
  }

  public async updateAvatar(user_id: number, avatar_filename: string): Promise<number> {
    const data: UpdateData = { avatar_filename };
    const changes = this.userRepository.updateById(user_id, data);
    return changes;
  }

  private async updatePassword(user_id: number, update_data: PasswordUpdateData): Promise<string> {

    const user = await this.getUserById(user_id);
    if (!user.password_hash) {
      const error = new Error('Forbidden operation: No existing password to update');
      (error as any).code = 'FORBIDDEN_OPERATION';
      throw error;
    }
    const { password_hash } = await this.authClient.updatePasswordHash(update_data, user.password_hash);
    return password_hash;
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

  public async deleteUser(userId: number): Promise<number> {
    return this.userRepository.markAsDeleted(userId);
  }

  public async resetAvatarToDefault(userId: number): Promise<number> {
    return this.userRepository.resetAvatarToDefault(userId);
  }
}