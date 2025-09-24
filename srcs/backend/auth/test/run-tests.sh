#!/bin/bash

echo "🧪 Running all tests for Auth service"
echo "====================================="
echo

# Change to auth directory to have access to node_modules
cd "$(dirname "$0")/.." # Go up one level to auth directory (from test/ to auth/)

echo "📍 Current directory: $(pwd)"
echo

# Check if node_modules exists in auth directory
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Installing dependencies..."
    npm install
    echo
fi

# Test 1: RSA implementation test
echo "1️⃣ Running RSA JWT tests..."
echo "----------------------------"
node test/test-rsa.js
echo

# Test 2: API tests (if services are running)
echo "2️⃣ Running API tests..."
echo "-----------------------"
node test/test-api.js
echo

# Test 3: JWT token analysis (standalone)
echo "3️⃣ Running JWT token analysis..."
echo "--------------------------------"
node test/test-jwt.js
echo

# Test 4: JWKS integration tests (if services are running)
echo "4️⃣ Running JWKS integration tests..."
echo "-----------------------------------"
echo "Note: These tests require the auth service to be running"
echo "Run: cd ../../../ && docker compose up -d backend-auth"
echo "Then: ./test-jwks.sh"
echo

echo "✅ All available tests completed!"
echo
echo "📝 Test files located in:"
echo "   - test-rsa.js     (RSA key and JWT tests)"
echo "   - test-api.js     (API endpoint tests)"  
echo "   - test-jwt.js     (JWT token analysis)"
echo "   - test-jwks.sh    (JWKS integration tests)"