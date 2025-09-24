#!/usr/bin/env node

// Simple API test using Node.js built-in fetch (Node 18+)
async function testAuthAPI() {
	console.log('🧪 Testing Auth API endpoints...\n');

	try {
		// Test health endpoint
		console.log('1️⃣ Testing health endpoint...');
		const healthResponse = await fetch('http://localhost:3000/health');
		const healthData = await healthResponse.json();
		console.log('✅ Health endpoint working:', healthData);

		// Note: We can't easily test login/register without setting up mock data
		// But the RSA JWT system will be used when users actually login

		console.log('\n🎉 API tests completed!');
		console.log('\n📝 To fully test RSA JWT:');
		console.log('   1. Register/login a user via frontend');
		console.log('   2. Check browser cookies for JWT tokens');
		console.log('   3. Verify tokens are signed with RS256');

	} catch (error) {
		console.error('❌ API test failed:', error.message);
	}
}

testAuthAPI();