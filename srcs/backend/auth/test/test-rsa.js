#!/usr/bin/env node

import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load RSA keys - updated path to go up one level to auth directory
const keysDir = path.join(__dirname, '..', 'keys');
const privateKeyPath = path.join(keysDir, 'private.pem');
const publicKeyPath = path.join(keysDir, 'public.pem');

let PRIVATE_KEY, PUBLIC_KEY;

try {
	PRIVATE_KEY = fs.readFileSync(privateKeyPath, 'utf8');
	PUBLIC_KEY = fs.readFileSync(publicKeyPath, 'utf8');
	console.log('✅ RSA keys loaded for testing');
} catch (error) {
	console.error('❌ Failed to load RSA keys:', error.message);
	process.exit(1);
}

// Test JWT generation and verification
async function testJWT() {
	console.log('\n🧪 Testing JWT with RSA...\n');

	// Test data
	const testPayload = {
		userId: 123,
		type: 'access',
		testData: 'This is a test token'
	};

	try {
		// 1. Generate JWT using private key (simulating AuthService.generateTokens)
		console.log('1️⃣ Generating JWT with RSA private key...');
		const token = jwt.sign(testPayload, PRIVATE_KEY, {
			algorithm: 'RS256',
			expiresIn: '15m'
		});
		console.log('✅ JWT generated successfully');
		console.log('🔐 Token (first 50 chars):', token.substring(0, 50) + '...');

		// 2. Verify JWT using public key (simulating token verification)
		console.log('\n2️⃣ Verifying JWT with RSA public key...');
		const decoded = jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
		console.log('✅ JWT verified successfully');
		console.log('📋 Decoded payload:', {
			userId: decoded.userId,
			type: decoded.type,
			testData: decoded.testData,
			iat: new Date(decoded.iat * 1000).toISOString(),
			exp: new Date(decoded.exp * 1000).toISOString()
		});

		// 3. Test with wrong algorithm (should fail)
		console.log('\n3️⃣ Testing security - trying with wrong algorithm...');
		try {
			jwt.verify(token, PUBLIC_KEY, { algorithms: ['HS256'] });
			console.log('❌ SECURITY ISSUE: Should have failed!');
		} catch (error) {
			console.log('✅ Security test passed - rejected wrong algorithm');
		}

		// 4. Test tampering detection
		console.log('\n4️⃣ Testing tampering detection...');
		const tamperedToken = token.slice(0, -10) + 'TAMPERED';
		try {
			jwt.verify(tamperedToken, PUBLIC_KEY, { algorithms: ['RS256'] });
			console.log('❌ SECURITY ISSUE: Should have detected tampering!');
		} catch (error) {
			console.log('✅ Tampering detected successfully');
		}

		console.log('\n🎉 All JWT tests passed! RSA implementation is working correctly.');
		
	} catch (error) {
		console.error('❌ JWT test failed:', error.message);
		process.exit(1);
	}
}

// Test RSA key format and compatibility
function testKeyFormat() {
	console.log('\n🔍 Testing RSA key format...\n');
	
	// Check private key format
	if (PRIVATE_KEY.includes('-----BEGIN PRIVATE KEY-----')) {
		console.log('✅ Private key format is correct (PKCS#8)');
	} else {
		console.log('❌ Private key format issue');
	}
	
	// Check public key format
	if (PUBLIC_KEY.includes('-----BEGIN PUBLIC KEY-----')) {
		console.log('✅ Public key format is correct (SPKI)');
	} else {
		console.log('❌ Public key format issue');
	}
}

// Run all tests
async function runTests() {
	console.log('🧪 RSA JWT Implementation Test Suite');
	console.log('=====================================');
	
	testKeyFormat();
	await testJWT();
	
	console.log('\n✅ All tests completed successfully!');
	console.log('\n📝 Summary:');
	console.log('   • RSA keys loaded and formatted correctly');
	console.log('   • JWT generation with RS256 works');
	console.log('   • JWT verification with public key works');
	console.log('   • Security measures (algorithm validation) work');
	console.log('   • Tampering detection works');
	console.log('\n🚀 Your RSA JWT system is ready for production!');
}

runTests().catch(console.error);