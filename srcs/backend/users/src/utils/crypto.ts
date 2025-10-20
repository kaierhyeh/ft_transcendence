import bcrypt from 'bcrypt';

// Hash password with bcrypt
export async function hashPassword(password: string, saltRounds: number = 10): Promise<string> {
    try {
        return await bcrypt.hash(password, saltRounds);
    } catch (error) {
        console.error('Password hashing error:', error);
        throw new Error('Failed to hash password');
    }
}

// Verify password with bcrypt
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        console.error('Password verification error:', error);
        throw new Error('Failed to verify password');
    }
}