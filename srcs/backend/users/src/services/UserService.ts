import { UserRepository } from '../repositories/UserRepository';
// import bcrypt from 'bcrypt';
import { AccountCreationData, GoogleUserCreationData, LocalUserCreationData } from '../schemas';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async createAccount(data: AccountCreationData): Promise<{ user_id: number }> {
    if (data.type === "local") {
      return this.createLocalAccount(data);
    } else if (data.type === "google") {
      return this.createGoogleAccount(data);
    }
    
    throw new Error('Invalid account type');
  }

  private async createLocalAccount(data: LocalUserCreationData) {
    // Hash password
    // const password_hash = await bcrypt.hash(data.password, 10);
    
    // Create user
    const user_id = await this.userRepository.createLocalUser({
      username: data.username,
      email: data.email,
      password_hash: data.password_hash,
      alias: data.alias,
      avatar_url: data.avatar_url
    });

    return { user_id };
  }

  private async createGoogleAccount(data: GoogleUserCreationData) {
    const user_id = await this.userRepository.createGoogleUser({
      google_sub: data.google_sub,
      username: data.username,
      email: data.email,
      alias: data.alias,
      avatar_url: data.avatar_url
    });

    return { user_id };
  }

  // async getUserById(id: number) {
  //   const user = await this.userRepository.findById(id);
  //   if (!user) {
  //     const error = new Error('User not found');
  //     (error as any).code = 'USER_NOT_FOUND';
  //     throw error;
  //   }
  //   return user;
  // }
}