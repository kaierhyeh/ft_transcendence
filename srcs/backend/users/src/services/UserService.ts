import { AuthClient } from '../clients/AuthClient';
import { UpdateData, UserRepository, UserRow } from '../repositories/UserRepository';
import { GoogleUserCreationData, GuestUserCreationData, LocalUserCreationData, PasswordUpdateData, UpdateRawData, UserCreationData } from '../schemas';

export class UserService {
  private authClient: AuthClient;

  constructor(
    private userRepository: UserRepository,
  ) {
    this.authClient = new AuthClient();
  }

  public async createUser(data: UserCreationData): Promise<{ user_id: number }> {
    if (data.type === "local") {
      return this.createLocalUser(data);
    } else if (data.type === "google") {
      return this.createGoogleUser(data);
    } else if (data.type === "guest") {
      return this.createGuestUser(data);
    }
    
    throw new Error('Invalid account type');
  }

  private async createLocalUser(data: LocalUserCreationData) {
    const user_data = {
      username: data.username,
      email: data.email,
      password_hash: data.password_hash,
      alias: data.alias ?? data.username,
      avatar_url: data.avatar_url
    };

    const user_id = this.userRepository.createLocalUser(user_data);
    return { user_id };
  }

  private async createGoogleUser(data: GoogleUserCreationData) {
    const user_data = {
      google_sub: data.google_sub,
      username: data.username,
      email: data.email,
      alias: data.alias ?? data.username,
      avatar_url: data.avatar_url
    };

    const user_id = this.userRepository.createGoogleUser(user_data);
    return { user_id };
  }

  private async createGuestUser(data: GuestUserCreationData) {
    const user_data = {
      alias: data.alias ?? "Guest" 
    };

    const user_id = this.userRepository.createGuestUser(user_data);
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

  public async updateUser(user_id: number, raw_data: UpdateRawData): Promise<number> {
    // Transform raw user input to database format
    const data: UpdateData = {
      email: raw_data.email,
      alias: raw_data.alias,
      avatar_url: raw_data.avatar_url,
      settings: raw_data.settings,
      // Extract just the hash string from the auth service response
      password_hash: raw_data.password ? await this.updatePassword(user_id, raw_data.password) : undefined,
      // Extract the TwoFa object from the auth service response
      two_fa: raw_data.two_fa_enabled !== undefined ? await this.authClient.set2fa(raw_data.two_fa_enabled) : undefined
    };

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
}