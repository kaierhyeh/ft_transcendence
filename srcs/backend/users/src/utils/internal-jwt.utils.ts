import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';

export class InternalJWTUtils {
  private static internalPrivateKey: string | null = null;
  private static internalPublicKey: string | null = null;

  private static loadKeys(): void {
    if (this.internalPrivateKey && this.internalPublicKey) {
      return; // Already loaded
    }

    try {
      const privateKeyPath = '/run/secrets/internal-access-private.pem';
      const publicKeyPath = '/run/secrets/internal-access-public.pem';

      if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
        this.internalPrivateKey = fs.readFileSync(privateKeyPath, 'utf8');
        this.internalPublicKey = fs.readFileSync(publicKeyPath, 'utf8');
      } else {
        throw new Error('Internal access key files not found');
      }
    } catch (error) {
      console.error('Failed to load internal JWT keys:', error);
      throw error;
    }
  }

  static generateInternalJWT(): string {
    this.loadKeys();

    if (!this.internalPrivateKey) {
      throw new Error('Internal private key not loaded');
    }

    // Use the same key ID as the auth service for INTERNAL_ACCESS tokens
    // This should match the key ID in the JWKS
    const keyId = 'internal_access_533da56606c3';

    const signOptions: jwt.SignOptions = {
      algorithm: 'RS256',
      expiresIn: '1h',
      issuer: 'ft_transcendence',
      subject: 'internal-service',
      keyid: keyId
    };

    return jwt.sign(
      {
        type: 'INTERNAL_ACCESS',
        service: 'users-service'
      },
      this.internalPrivateKey,
      signOptions
    );
  }

  static verifyInternalJWT(token: string): boolean {
    try {
      this.loadKeys();

      if (!this.internalPublicKey) {
        throw new Error('Internal public key not loaded');
      }

      jwt.verify(token, this.internalPublicKey, {
        algorithms: ['RS256'],
        issuer: 'ft_transcendence'
      });

      return true;
    } catch (error) {
      console.error('Internal JWT verification failed:', error);
      return false;
    }
  }
}