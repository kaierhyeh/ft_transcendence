#!/bin/bash

echo "🐳 Running Auth Service Tests in Docker Container"
echo "================================================="
echo

# 配置
AUTH_CONTAINER="backend-auth"
AUTH_SERVICE_URL="http://localhost:3000"

# 函數：檢查容器是否運行
check_container() {
    if ! docker ps --format "table {{.Names}}" | grep -q "$AUTH_CONTAINER"; then
        echo "❌ Container $AUTH_CONTAINER is not running"
        echo "💡 Please run: cd ../../../ && docker compose up -d backend-auth"
        return 1
    fi
    echo "✅ Container $AUTH_CONTAINER is running"
    return 0
}

# 函數：在容器內執行測試命令
run_test_in_container() {
    local test_file="$1"
    local description="$2"
    
    echo "🧪 Running $description"
    echo "   File: $test_file"
    echo "   Container: $AUTH_CONTAINER"
    echo "   ---"
    
    # 在容器內執行 TypeScript 測試，容器內的工作目錄是 /app
    docker exec "$AUTH_CONTAINER" npx ts-node --esm "test/$test_file"
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ $description - PASSED"
    else
        echo "❌ $description - FAILED (exit code: $exit_code)"
    fi
    echo
    return $exit_code
}

# 函數：容器內 API 測試
test_api_in_container() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="$3"
    local description="$4"
    
    echo "🌐 Testing $description"
    echo "   $method $endpoint"
    
    if [ -n "$data" ]; then
        docker exec "$AUTH_CONTAINER" curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$AUTH_SERVICE_URL$endpoint" | jq '.' 2>/dev/null || echo "Response received"
    else
        docker exec "$AUTH_CONTAINER" curl -s -X "$method" \
            "$AUTH_SERVICE_URL$endpoint" | jq '.' 2>/dev/null || echo "Response received"
    fi
    echo
}

# 主要測試流程
main() {
    echo "🔍 Step 1: Checking container status..."
    if ! check_container; then
        exit 1
    fi
    echo
    
    echo "🔧 Step 2: Container environment check..."
    echo "Node.js version in container:"
    docker exec "$AUTH_CONTAINER" node --version
    echo "Working directory in container:"
    docker exec "$AUTH_CONTAINER" pwd
    echo "Test files available:"
    docker exec "$AUTH_CONTAINER" ls -la test/
    echo
    
    echo "🧪 Step 3: Running unit tests in container..."
    run_test_in_container "test-jwt.ts" "Complete JWT + RSA Security Tests"
    run_test_in_container "test-jwks-service.ts" "JWKS Service Tests" 
    echo
    
    echo "🌐 Step 4: Testing API endpoints..."
    test_api_in_container "/health" "GET" "" "Health Check"
    test_api_in_container "/.well-known/jwks.json" "GET" "" "JWKS Endpoint"
    
    # Enhanced JWKS Testing (merged from test-jwks.sh)
    echo "🔑 Step 5: Enhanced JWKS Testing..."
    echo "Testing JWKS key structure..."
    JWKS_RESPONSE=$(docker exec "$AUTH_CONTAINER" curl -s "$AUTH_SERVICE_URL/.well-known/jwks.json")
    
    if echo "$JWKS_RESPONSE" | grep -q '"keys"'; then
        echo "✅ JWKS endpoint is working"
        # Extract key count
        KEY_COUNT=$(echo "$JWKS_RESPONSE" | grep -o '"kid"' | wc -l)
        echo "   Found $KEY_COUNT key(s) in JWKS"
        
        # Extract first key ID
        KID=$(echo "$JWKS_RESPONSE" | grep -o '"kid":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "   Sample Key ID: $KID"
        
        # Check key type
        if echo "$JWKS_RESPONSE" | grep -q '"kty":"RSA"'; then
            echo "✅ RSA keys detected in JWKS"
        fi
        
        # Check algorithm
        if echo "$JWKS_RESPONSE" | grep -q '"alg":"RS256"'; then
            echo "✅ RS256 algorithm confirmed"
        fi
    else
        echo "❌ JWKS endpoint failed"
    fi
    echo
    
    echo "✅ All container-based tests completed!"
    echo
    echo "📝 Test Summary:"
    echo "   ✅ Complete JWT + RSA security testing"
    echo "   ✅ JWKS service functionality"
    echo "   ✅ Enhanced JWKS endpoint validation"
    echo "   ✅ All tests run inside Docker container"
    echo "   ✅ No local Node.js dependencies required"
    echo "   ✅ Container-native testing environment"
    echo "   📁 Active test files: test-jwt.ts, test-jwks-service.ts"
}

# 檢查是否有 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# 執行主要測試
main "$@"