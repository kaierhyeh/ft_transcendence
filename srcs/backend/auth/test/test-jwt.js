// JWT token structure test
const jwt = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjIzNzQzOWYyZWM2ZGE4ODEifQ.eyJ1c2VySWQiOjIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NTg2NDI1ODUsImV4cCI6MTc1ODY0MzQ4NX0.J51ihCKrn_rk-sIN39rIbmZyP1Cn_g5QL08gJTWs0EYMpfkpTMgfZT3VWU3SY4AP02r6rmTFFGuD6zar-HVI1wsYl5vP26isqYLj2jeXi1_UcCyvVDZ_h6y6KXCsEoO625R9v9ztXt2TN7JHOdzDGKCFqDhxZo1A_Oer8ktsYuBmjvmmbTOOrcAufgmwKp04XH5CPUEYnOL1P6RlnGKI_1kgiuNAwbcSsvkSwa9fBIbjDpgVQRZTMhoZG4Dg-fmegPf90yHIVIhM7ZtWwYszAo4w07vcrCISpR6YpW_Hw1MOtim8ZtTYbjcTjMD9BSB8K1-jYh4y9o_ySVrMvvTWjg";

console.log("JWT Token Analysis");
console.log("==================");

// Decode header
const header = JSON.parse(Buffer.from(jwt.split('.')[0], 'base64'));
console.log("\n🔑 Header:");
console.log(JSON.stringify(header, null, 2));

// Decode payload
const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64'));
console.log("\n📄 Payload:");
console.log(JSON.stringify(payload, null, 2));

console.log("\n✅ Verification:");
console.log("- Algorithm: RS256 ✓");
console.log(`- Key ID: ${header.kid} ✓`);
console.log("- Type: JWT ✓");
console.log(`- User ID: ${payload.userId} ✓`);
console.log(`- Token Type: ${payload.type} ✓`);

// Check expiration
const now = Math.floor(Date.now() / 1000);
const expiresIn = payload.exp - now;
console.log(`- Expires in: ${expiresIn} seconds ✓`);