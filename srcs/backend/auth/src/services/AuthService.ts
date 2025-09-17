import { UserClient } from '../clients/UserClient';
import { LoginData, SignupFormData } from '../schemas';
import hashPassword from '../utils/crypto';
import { isValidPassword } from '../utils/validation';

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

  async validateUser(data: LoginData): Promise<{ user_id: number, username: string }> {

    const { user_id, username, password_hash } = await this.userClient.getUserByLogin(data.login);

    const valid = await isValidPassword(data.password, password_hash);
    if (!valid) {
      const error = new Error('Invalid credentials');
      (error as any).code = 'INVALID_CREDENTIALS';
      throw error;
    }
    return {user_id, username};
  }

  async updatePasswordHash(old_hash: string, old_password: string, new_password: string): Promise<string> {
    // First verify the old password matches the old hash
    const valid = await isValidPassword(old_password, old_hash);
    if (!valid) {
      const error = new Error('Invalid current password');
      (error as any).code = 'INVALID_CURRENT_PASSWORD';
      (error as any).status = 401;
      throw error;
    }

    // If verification passes, hash the new password
    return await hashPassword(new_password);
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