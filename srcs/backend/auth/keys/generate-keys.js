#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';			// fs 是 Node.js 的內建模組（File System）
import path from 'path';

// 使用 Node.js crypto 模組生成 RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
	modulusLength: 2048,		// 2048 位金鑰長度
	publicKeyEncoding: {
		type: 'spki',			// Subject Public Key Info 格式
		format: 'pem'			// PEM 格式（文字格式）
	},
	privateKeyEncoding: {
		type: 'pkcs8',			// PKCS#8 格式
		format: 'pem'			// PEM 格式
	}
});

// Create keys directory if it doesn't exist
const keysDir = path.dirname(import.meta.url.replace('file://', ''));
if (!fs.existsSync(keysDir)) {
	fs.mkdirSync(keysDir, { recursive: true });
}

// 儲存為 private.pem 和 public.pem 檔案
fs.writeFileSync(path.join(keysDir, 'private.pem'), privateKey);
fs.writeFileSync(path.join(keysDir, 'public.pem'), publicKey);

console.log('✅ RSA key pair generated successfully!');
console.log(`📁 Keys saved to: ${keysDir}`);
console.log('🔐 private.pem - Private key (keep secure!)');
console.log('🔓 public.pem - Public key (for verification)');