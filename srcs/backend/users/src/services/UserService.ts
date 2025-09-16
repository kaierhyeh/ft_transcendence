import { UserRepository, UserRow } from '../repositories/UserRepository';
import { AccountCreationData, GoogleUserCreationData, LocalUserCreationData, UpdateData } from '../schemas';

export class UserService {
  constructor(
    private userRepository: UserRepository,
  ) {}

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

  public async updateUser(user_id: number, data: UpdateData): Promise<number> {
    // Implementation will be added later
    const changes = this.userRepository.updateById(user_id, data);

    return changes;
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