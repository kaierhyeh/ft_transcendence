import { AuthClient } from '../clients/AuthClient';
import { UpdateData, UserRepository, UserRow } from '../repositories/UserRepository';
import { AccountCreationData, GoogleUserCreationData, LocalUserCreationData, PasswordUpdateData, UpdateRawData } from '../schemas';

export class UserService {
  private authClient: AuthClient;

  constructor(
    private userRepository: UserRepository,
  ) {
    this.authClient = new AuthClient();
  }

  public async createAccount(data: AccountCreationData): Promise<{ user_id: number }> {
    if (data.type === "local") {
      return this.createLocalAccount(data);
    } else if (data.type === "google") {
      return this.createGoogleAccount(data);
    }
    
    throw new Error('Invalid account type');
  }

  private async createLocalAccount(data: LocalUserCreationData) {    
    const user_id = this.userRepository.createLocalUser({
      username: data.username,
      email: data.email,
      password_hash: data.password_hash,
      alias: data.alias,
      avatar_url: data.avatar_url
    });

    return { user_id };
  }

  private async createGoogleAccount(data: GoogleUserCreationData) {
    const user_id = this.userRepository.createGoogleUser({
      google_sub: data.google_sub,
      username: data.username,
      email: data.email,
      alias: data.alias,
      avatar_url: data.avatar_url
    });

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