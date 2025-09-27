import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface KeyPair {
    privateKey: string;
    publicKey: string;
}

/**
 * Generate RSA key pair using Node.js crypto module
 */
export function generateKeyPair(): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,        // 2048-bit key length
        publicKeyEncoding: {
            type: 'spki',           // Subject Public Key Info format
            format: 'pem'           // PEM format (text format)
        },
        privateKeyEncoding: {
            type: 'pkcs8',          // PKCS#8 format
            format: 'pem'           // PEM format
        }
    });

    return { privateKey, publicKey };
}

/**
 * Generate and save key pair to files
 */
export function generateAndSaveKeyPair(keyName: string, keysDir: string): void {
    const { privateKey, publicKey } = generateKeyPair();
    
    const privateKeyPath = path.join(keysDir, `${keyName}_private.pem`);
    const publicKeyPath = path.join(keysDir, `${keyName}_public.pem`);
    
    // Create keys directory if it doesn't exist
    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true, mode: 0o700 }); // Secure permissions
    }
    
    // Write keys with secure permissions
    fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 }); // Read/write for owner only
    fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });   // Read for all, write for owner
    
    console.log(`✅ Generated ${keyName} key pair:`);
    console.log(`   🔐 ${privateKeyPath} (keep secure!)`);
    console.log(`   🔓 ${publicKeyPath} (for verification)`);
}

/**
 * Check if all required key files exist
 */
export function checkKeyFiles(keysDir: string): { missing: string[], existing: string[] } {
    const requiredKeys = ['user', 'game', 'internal'];
    const missing: string[] = [];
    const existing: string[] = [];
    
    for (const keyName of requiredKeys) {
        const privateKeyPath = path.join(keysDir, `${keyName}_private.pem`);
        const publicKeyPath = path.join(keysDir, `${keyName}_public.pem`);
        
        if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
            existing.push(keyName);
        } else {
            missing.push(keyName);
        }
    }
    
    return { missing, existing };
}

/**
 * Initialize all required JWT keys
 */
export function initializeKeys(): void {
    const keysDir = '/app/data/keys';  // Fixed path in container
    
    console.log('🔑 Initializing JWT keys...');
    
    const { missing, existing } = checkKeyFiles(keysDir);
    
    if (existing.length > 0) {
        console.log(`✅ Existing keys found: ${existing.join(', ')}`);
    }
    
    if (missing.length > 0) {
        console.log(`🔄 Generating missing keys: ${missing.join(', ')}`);
        
        for (const keyName of missing) {
            try {
                generateAndSaveKeyPair(keyName, keysDir);
            } catch (error) {
                console.error(`❌ Failed to generate ${keyName} keys:`, error);
                throw new Error(`Key generation failed for ${keyName}: ${(error as Error).message}`);
            }
        }
        
        console.log(`🎉 All keys generated successfully in: ${keysDir}`);
    } else {
        console.log('✅ All required keys already exist');
    }
}