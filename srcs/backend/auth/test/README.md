# Auth Service Testing Guide

## 🐳 Container-Based Testing

All tests now run inside Docker containers - **no local Node.js installation required**.

## 🚀 Quick Start

```bash
# 1. Start the auth service
cd ../../.. && docker compose up -d backend-auth

# 2. Run all tests
cd srcs/backend/auth/test
./run-tests.sh
```

## 📁 Test Files

| File | Description | Environment |
|------|-------------|-------------|
| `run-tests.sh` | Complete test runner with JWKS validation | Docker container |
| `test-jwt.ts` | Complete JWT + RSA security tests | Container-executed |
| `test-jwks-service.ts` | JWKS service functionality tests | Container-executed |

## 🔧 Changes Made

### ✅ Removed Local Dependencies
- ❌ Deleted local `node_modules/`
- ❌ Removed local `npm install` requirements
- ❌ No local Node.js environment needed

### ✅ Container-Native Testing
- ✅ All tests run inside `backend-auth` container
- ✅ Uses container's Node.js and npm packages
- ✅ Complete JWT security validation
- ✅ Integrated JWKS endpoint testing
- ✅ RSA key security testing
- ✅ Container-based curl commands for API testing

### ✅ Benefits
- 🏗️ **Environment Consistency** - Same environment as production
- 🚫 **No Local Pollution** - Host system stays clean
- 🔄 **Easy CI/CD** - Tests run in containerized environment
- 📦 **Self-Contained** - Everything needed is in the container

## 🛠️ Technical Details

### Container Commands Used
```bash
# Execute TypeScript tests in container
docker exec backend-auth npx ts-node --esm test/test-jwt.ts

# Execute curl commands in container
docker exec backend-auth curl -s http://localhost:3000/health

# Check container status
docker ps --format "table {{.Names}}" | grep backend-auth
```

### File Structure
```
auth/
├── test/
│   ├── run-tests.sh              # 🐳 Complete container test runner
│   ├── test-jwt.ts               # Complete JWT + RSA tests
│   ├── test-jwks-service.ts      # JWKS service tests
│   ├── tsconfig.json             # TypeScript configuration
│   └── README.md                 # This documentation
└── src/                          # Application source
```

## 🎯 Usage Examples

### Run All Tests
```bash
./run-tests.sh
```

### Test Specific Component
```bash
# Direct container execution
docker exec backend-auth npx ts-node --esm test/test-jwt.ts
docker exec backend-auth npx ts-node --esm test/test-jwks-service.ts
```

---

**Note**: All tests require the auth service container to be running. Use `docker compose up -d backend-auth` to start it.