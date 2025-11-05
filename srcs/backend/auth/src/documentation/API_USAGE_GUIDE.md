# Auth Service API 使用指南

## 三種 JWT 類型使用說明

本認證服務提供三種不同的 JWT 類型，每種都有其特定用途和使用場景：

### 1. USER_SESSION 🔐 (用戶會話)
**用途**: 傳統的網頁應用用戶認證
**特點**: 
- Access Token: 15分鐘有效期
- Refresh Token: 7天有效期  
- 自動刷新機制
- Cookie-based 儲存

**API 使用範例**:
```typescript
// 登入獲取 USER_SESSION tokens
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'user', password: 'pass' })
});

const result = await response.json();

// 使用 USER_SESSION 中間件保護路由
import { userSessionMiddleware } from '../middleware/auth.middleware';

app.post('/protected-route', {
  preHandler: userSessionMiddleware  // 驗證用戶會話
}, async (request, reply) => {
  const userId = request.user.userId; // 來自 middleware
  // 處理已驗證的用戶請求
});
```

### 2. GAME_SESSION 🎮 (遊戲會話)
**用途**: 遊戲特定的臨時會話認證
**特點**:
- 單一 Token: 預設2小時有效期
- 包含 userId 和 gameId
- 無自動刷新 (遊戲有固定時間)
- 適合即時遊戲場景

**Game Service 可以這樣使用**:
```typescript
// 在 ~/develop/srcs/backend/game/src/routes 中

// 1. 創建遊戲會話 (呼叫 Auth Service)
async function createGameSession(userId: number, gameId: string) {
  const response = await fetch('http://auth-service:3001/game/session/create', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': userSessionCookie // 需要先有 USER_SESSION
    },
    body: JSON.stringify({ gameId, expiryMinutes: 120 })
  });
  
  const result = await response.json();
  return result.gameToken;
}

// 2. 在 Game Service 中驗證遊戲會話
app.get('/game/:gameId/state', {
  preHandler: async (request, reply) => {
    const gameToken = request.headers.authorization?.replace('Bearer ', '');
    
    if (!gameToken) {
      return reply.code(401).send({ error: 'Game token required' });
    }
    
    // 向 Auth Service 驗證 GAME_SESSION token
    const validation = await authService.validateToken(gameToken, 'GAME_SESSION');
    
    if (!validation.valid) {
      return reply.code(401).send({ error: 'Invalid game session' });
    }
    
    request.user = { 
      userId: validation.payload.userId,
      gameId: validation.payload.gameId,
      jwtType: 'GAME_SESSION'
    };
  }
}, async (request, reply) => {
  // 處理已驗證的遊戲請求
  const { userId, gameId } = request.user;
  // 返回遊戲狀態
});
```

### 3. INTERNAL_ACCESS 🔧 (內部服務)
**用途**: 微服務之間的通信認證
**特點**:
- 單一 Token: 預設1小時有效期
- 包含 serviceId 和 permissions
- 長生命週期，適合服務間通信
- 權限控制系統

**其他微服務可以這樣使用**:
```typescript
// 例如：Chat Service 需要驗證用戶資訊

interface InternalTokenRequest {
  serviceId: string;
  permissions: string[];
  expiryHours?: number;
  secretKey: string;
}

interface InternalTokenResponse {
  success: boolean;
  internalToken: string;
  serviceId: string;
  permissions: string[];
  expiryHours: number;
}

interface UserData {
  id: number;
  username: string;
  email: string;
  status: string;
  lastLogin: string;
}

interface InternalUserResponse {
  success: boolean;
  userData: UserData;
  accessedBy: string;
  timestamp: string;
}

// 1. Chat Service 啟動時獲取內部令牌
async function initInternalAuth(): Promise<string> {
  const response = await fetch('http://auth-service:3001/internal/token/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: 'chat-service',
      permissions: ['read', 'users:validate'],
      secretKey: process.env.INTERNAL_SERVICE_SECRET!
    } as InternalTokenRequest)
  });
  
  const result: InternalTokenResponse = await response.json();
  return result.internalToken;
}

// 2. Chat Service 使用內部 API 驗證用戶
async function validateUser(userId: number, internalToken: string): Promise<UserData | null> {
  const response = await fetch(`http://auth-service:3001/internal/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${internalToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    return null;
  }
  
  const result: InternalUserResponse = await response.json();
  return result.userData;
}

// 3. 批量驗證用戶
interface ValidationRequest {
  userIds: number[];
}

interface ValidationResult {
  userId: number;
  valid: boolean;
  exists: boolean;
  status: string;
}

interface ValidationResponse {
  success: boolean;
  validationResults: ValidationResult[];
  totalUsers: number;
  validUsers: number;
  accessedBy: string;
  timestamp: string;
}

async function validateMultipleUsers(
  userIds: number[], 
  internalToken: string
): Promise<ValidationResult[]> {
  const response = await fetch('http://auth-service:3001/internal/users/validate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${internalToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userIds } as ValidationRequest)
  });
  
  const result: ValidationResponse = await response.json();
  return result.validationResults;
}
```

## JWKS 端點使用

其他微服務可以從 JWKS 端點獲取公鑰來獨立驗證 JWT：

```typescript
// 獲取 JWKS 公鑰
interface JWK {
  kty: string;
  use: string;
  alg: string;
  kid: string;
  n: string;
  e: string;
}

interface JWKS {
  keys: JWK[];
}

const jwksResponse = await fetch('http://auth-service:3001/.well-known/jwks.json');
const jwks: JWKS = await jwksResponse.json();

// 使用 jsonwebtoken 和 jwks-rsa 驗證 token
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: 'http://auth-service:3001/.well-known/jwks.json'
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  client.getSigningKey(header.kid!, (err, key) => {
    if (err) {
      return callback(err);
    }
    
    const signingKey = key!.getPublicKey();
    callback(null, signingKey);
  });
}

// 驗證任何類型的 JWT
function verifyToken<T = any>(token: string): Promise<T> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { 
      algorithms: ['RS256'] 
    }, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded as T);
    });
  });
}

// 使用範例
interface GameTokenPayload {
  userId: number;
  gameId: string;
  type: 'GAME_SESSION';
  iat: number;
  exp: number;
}

const gamePayload = await verifyToken<GameTokenPayload>(gameToken);
console.log(`User ${gamePayload.userId} in game ${gamePayload.gameId}`);
```

## TypeScript 類型定義

```typescript
// auth.types.ts
export type JWTType = 'USER_SESSION' | 'GAME_SESSION' | 'INTERNAL_ACCESS';

export interface JWTPayload {
  userId?: number;
  gameId?: string;
  serviceId?: string;
  type: JWTType;
  permissions?: string[];
  [key: string]: any;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  expired?: boolean;
  blacklisted?: boolean;
  error?: string;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: number;
    jwtType?: string;
    gameId?: string;
    serviceId?: string;
    permissions?: string[];
  };
}
```

## 安全性特點

### RSA 金鑰架構
- **三個獨立金鑰對**: 每種 JWT 類型使用專用的 RSA-2048 金鑰對
- **金鑰隔離**: USER_SESSION、GAME_SESSION、INTERNAL_ACCESS 無法互相驗證
- **RS256 算法**: 使用 SHA-256 的 RSA 簽名，提供高安全性
- **JWKS 支援**: 標準化的公鑰分發機制

### 測試驗證的安全性
```typescript
// 測試確保跨類型驗證會失敗
const userToken = jwtService.generateUserSessionToken({ username: 'test' });
const gameValidation = jwtService.validateToken(userToken, 'GAME_SESSION');
// Result: { valid: false, error: 'invalid signature' }
```

### 金鑰管理
- **動態金鑰生成**: 每次測試運行時生成新的金鑰對
- **金鑰標識**: 每個金鑰都有唯一的 Key ID (kid)
- **公鑰分發**: 通過 JWKS 端點提供驗證所需的公鑰

## 測試套件使用指南

### 運行完整測試

```bash
# 進入測試目錄
cd ~/develop/srcs/backend/auth/test

# 運行完整測試套件 (Docker 容器內)
./run-tests.sh
```

### 測試內容

測試套件包含以下測試：

#### 1. JWT 完整安全測試 (`test-jwt.ts`)
- ✅ 三種 JWT 類型生成和驗證
- ✅ RSA 金鑰對安全性測試
- ✅ 跨類型驗證阻擋測試
- ✅ JWKS 公鑰資訊準備

#### 2. JWKS 服務測試 (`test-jwks-service.ts`)
- ✅ JWKS 端點格式驗證
- ✅ 金鑰查找功能測試
- ✅ 金鑰統計資訊測試

#### 3. API 端點測試
- ✅ 健康檢查端點
- ✅ JWKS 端點響應

### 測試環境

所有測試都在 Docker 容器內運行，無需本地 Node.js 環境：

```bash
# 啟動認證服務
docker compose up -d backend-auth

# 運行測試
cd test && ./run-tests.sh
```

### 測試結果範例

```
🧪 Testing New JWT Service with Three Types
🔑 JWT keys loaded for all three types
✅ User Session Token: eyJhbGciOiJSUzI1NiIs...
✅ Game Session Token: eyJhbGciOiJSUzI1NiIs...
✅ Internal Access Token: eyJhbGciOiJSUzI1NiIs...

User Token Verification: ✅ VALID
Game Token Verification: ✅ VALID
Internal Token Verification: ✅ VALID

✅ Cross-verification correctly failed: invalid signature
✅ JWKS-ready public key information available
```

## 總結

- **USER_SESSION**: 網頁應用用戶認證，使用 cookies，15分鐘 access token
- **GAME_SESSION**: 遊戲特定會話，短期有效，2小時 Bearer token
- **INTERNAL_ACCESS**: 微服務間通信，1小時有效，權限控制

每種類型都有專用的中間件，提供完整的類型安全和自動完成功能。

### 測試覆蓋
- ✅ 完整的 JWT 生成和驗證測試
- ✅ RSA 金鑰安全性測試
- ✅ JWKS 端點功能測試
- ✅ 跨類型驗證阻擋測試
- ✅ Docker 容器化測試環境