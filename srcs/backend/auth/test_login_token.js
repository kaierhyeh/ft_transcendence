import jwt from "jsonwebtoken";

const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjIzNzQzOWYyZWM2ZGE4ODEifQ.eyJ1c2VySWQiOjQsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NTg3ODkyNjcsImV4cCI6MTc1ODc5MDE2N30.rGsn6Zm6W4NgOEB9e8YKb3OsdhY8S9Cqr-ETh5S3KzEEK5kfdKjXvnlE_rN6R7AiTgPCoxarXQ9_peT_JyMBvv7AfNu4HdprYw4E1TnHT3gw41MTkbeYoECXPIFt_HIpVv0rPFqsO-7rngu0qdX15pHMl5kuZk9FBmfvDONHKNgxGr0rOA7iznIwpNoqAhPaxW8k_-w-h23ZhfuXahm9DMHp3bpXfKiEPKk87s8OQLCLgScOmhkCA71VSd5jDOJ05DlEMWnNaCb779zt3AMRqkMTebgQGI9N4qWkV0_xfKcFQScu2d5AYaO6I1p3aygn1pgUNodZ-dI9UiKH_qOtgA";

console.log("🔍 Analyzing JWT token from login...");
console.log("=====================================");

const decoded = jwt.decode(token, { complete: true });
console.log("Header:", JSON.stringify(decoded.header, null, 2));
console.log("Payload:", JSON.stringify(decoded.payload, null, 2));

console.log("
✅ Token analysis complete!");
