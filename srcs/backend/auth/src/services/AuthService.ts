import { UserClient } from '../clients/UserClient';
import { SignupFormData } from '../schemas';
import hashPassword from '../utils/crypto';

export type LocalUserCreationData = Omit<SignupFormData, "password"> & {
  type: "local";
  password_hash: string;
};

export class AuthService {
  private userClient: UserClient;

  constructor() {
    this.userClient = new UserClient();
  }

  async signup(data: SignupFormData): Promise<{ user_id: number }> {
    const password_hash =  await hashPassword(data.password);

    const { user_id } = await this.userClient.signup({
      type: "local",
      username: data.username,
      email: data.email,
      password_hash,
      alias: data.alias || undefined,
      avatar_url: data.avatar_url || undefined
    });
  
    return { user_id };
  }

  // private async createGoogleAccount(data: GoogleUserCreationData) {
  //   const user_id = this.userRepository.createGoogleUser({
  //     google_sub: data.google_sub,
  //     username: data.username,
  //     email: data.email,
  //     alias: data.alias,
  //     avatar_url: data.avatar_url
  //   });

  //   return { user_id };
  // }

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