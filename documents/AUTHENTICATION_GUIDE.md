# ft_transcendence 認證系統完整指南

## 📚 目錄

1. [基礎概念：什麼是 JWT？](#1-基礎概念什麼是-jwt)
2. [Session vs Token 認證](#2-session-vs-token-認證)
3. [專案中的 JWT 實作](#3-專案中的-jwt-實作)
4. [JWKS (JSON Web Key Set)](#4-jwks-json-web-key-set)
5. [Google OAuth 整合](#5-google-oauth-整合)
6. [Two-Factor Authentication (2FA)](#6-two-factor-authentication-2fa)
7. [Route Protection (路由保護)](#7-route-protection-路由保護)
8. [多語言系統 (i18n)](#8-多語言系統-i18n)
9. [Evaluation Defense 重點](#9-evaluation-defense-重點)

---

## 1. 基礎概念：什麼是 JWT？

### 什麼是 JWT (JSON Web Token)？

JWT 是一種**開放標準 (RFC 7519)**，用於在各方之間安全地傳輸信息的 token。

### JWT 的結構

JWT 由三個部分組成，用 `.` 分隔：

```
Header.Payload.Signature
```

#### 1.1 Header (標頭)

```json
{
  "alg": "RS256",  // 使用的加密算法
  "typ": "JWT"     // Token 類型
}
```

#### 1.2 Payload (有效載荷)

```json
{
  "sub": "1234567890",        // Subject: 用戶 ID
  "username": "john_doe",     // 自定義數據
  "iat": 1516239022,          // Issued At: 發行時間
  "exp": 1516242622           // Expiration: 過期時間
}
```

#### 1.3 Signature (簽名)

```javascript
RSASHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  privateKey
)
```

### 為什麼使用 JWT？

✅ **優點：**
- **無狀態 (Stateless)**：服務器不需要保存 session
- **可擴展性 (Scalable)**：適合微服務架構
- **跨域友好 (CORS-friendly)**：可以在不同域名間使用
- **自包含 (Self-contained)**：Token 本身包含所有必要信息

❌ **缺點：**
- **無法主動撤銷**：需要額外的黑名單機制
- **Token 較大**：相比 session ID
- **敏感數據風險**：不應在 payload 存儲機密信息

---

## 2. Session vs Token 認證

### 2.1 Session-based Authentication (傳統方式)

```
┌─────────┐                    ┌─────────┐
│ Browser │                    │ Server  │
└────┬────┘                    └────┬────┘
     │                              │
     │  1. Login (username/pwd)     │
     │─────────────────────────────>│
     │                              │
     │  2. Create Session           │
     │     Store in DB/Redis        │
     │                              │
     │  3. Return Session ID        │
     │<─────────────────────────────│
     │  Set-Cookie: sessionId=xxx   │
     │                              │
     │  4. Requests with Cookie     │
     │─────────────────────────────>│
     │                              │
     │  5. Lookup Session in DB     │
     │                              │
     │  6. Response                 │
     │<─────────────────────────────│
```

**特點：**
- Server 端需要儲存 session 狀態
- 需要 session store (Redis, Database)
- 容易撤銷（刪除 session）

### 2.2 Token-based Authentication (JWT)

```
┌─────────┐                    ┌─────────┐
│ Browser │                    │ Server  │
└────┬────┘                    └────┬────┘
     │                              │
     │  1. Login (username/pwd)     │
     │─────────────────────────────>│
     │                              │
     │  2. Generate JWT             │
     │     Sign with Private Key    │
     │                              │
     │  3. Return JWT               │
     │<─────────────────────────────│
     │                              │
     │  4. Requests with JWT        │
     │  Authorization: Bearer xxx   │
     │─────────────────────────────>│
     │                              │
     │  5. Verify JWT Signature     │
     │     (No DB lookup!)          │
     │                              │
     │  6. Response                 │
     │<─────────────────────────────│
```

**特點：**
- Server 不需要儲存狀態
- 驗證只需檢查簽名
- 更適合分散式系統

---

## 3. 專案中的 JWT 實作

### 3.1 JWT Service 架構

你的專案位置：`/home/kyeh/develop/srcs/backend/auth/src/services/jwt.service.ts`

#### 核心功能：

```typescript
// 1. 生成 Access Token (短期，15分鐘)
generateAccessToken(userId: number, username: string): string

// 2. 生成 Refresh Token (長期，7天)
generateRefreshToken(userId: number, username: string): string

// 3. 驗證 Token
verifyToken(token: string, type: 'access' | 'refresh'): TokenPayload

// 4. 提供公鑰給其他服務驗證
getPublicKey(): string
```

### 3.2 雙 Token 策略 (Access + Refresh)

```
Access Token (短期，15 min)
├── 用途：API 請求認證
├── 存放：瀏覽器 memory (不存 localStorage)
└── 過期：快速過期，安全性高

Refresh Token (長期，7 天)
├── 用途：更新 Access Token
├── 存放：HttpOnly Cookie (XSS 防護)
└── 過期：慢速過期，方便性高
```

#### 為什麼需要兩種 Token？

**安全性 vs 便利性的平衡：**

1. **Access Token 短期**
   - 即使被竊取，15分鐘後就失效
   - 減少攻擊時間窗口

2. **Refresh Token 長期**
   - 用戶不需要頻繁登入
   - 存在 HttpOnly Cookie 中，JavaScript 無法訪問（防 XSS）

### 3.3 Token 刷新流程

```
┌─────────┐                    ┌──────────┐
│ Browser │                    │   Auth   │
│         │                    │  Service │
└────┬────┘                    └────┬─────┘
     │                              │
     │  API Request                 │
     │  Access Token Expired        │
     │─────────────────────────────>│
     │                              │
     │  401 Unauthorized            │
     │<─────────────────────────────│
     │                              │
     │  POST /auth/refresh          │
     │  (Refresh Token in Cookie)   │
     │─────────────────────────────>│
     │                              │
     │  Verify Refresh Token        │
     │                              │
     │  New Access Token            │
     │<─────────────────────────────│
     │                              │
     │  Retry API Request           │
     │  (New Access Token)          │
     │─────────────────────────────>│
     │                              │
     │  200 OK                      │
     │<─────────────────────────────│
```

### 3.4 實際代碼範例

#### 生成 Token

```typescript
// srcs/backend/auth/src/services/jwt.service.ts

generateAccessToken(userId: number, username: string): string {
  const payload: TokenPayload = {
    sub: userId.toString(),
    username,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 分鐘
  };

  return jwt.sign(payload, this.accessPrivateKey, {
    algorithm: 'RS256',
  });
}
```

#### 驗證 Token

```typescript
verifyToken(token: string, type: 'access' | 'refresh'): TokenPayload {
  const publicKey = type === 'access' 
    ? this.accessPublicKey 
    : this.refreshPublicKey;

  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
    }) as TokenPayload;

    // 檢查 token 類型
    if (decoded.type !== type) {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw new Error('Token verification failed');
  }
}
```

---

## 📝 Evaluation Defense - Part 1

### 評審可能問的問題：

#### Q1: "為什麼使用 JWT 而不是 Session？"

**回答要點：**
1. **微服務架構**：我們有多個服務（auth, users, game, stats），JWT 無狀態特性讓各服務可以獨立驗證
2. **水平擴展**：不需要 shared session store，可以輕鬆增加服務實例
3. **跨域支持**：前後端分離架構，JWT 更適合

#### Q2: "JWT 的安全性如何保證？"

**回答要點：**
1. **RS256 非對稱加密**：使用公私鑰對，私鑰只在 auth service
2. **雙 Token 策略**：Access Token 短期（15min），Refresh Token 在 HttpOnly Cookie
3. **Token 類型檢查**：防止 Refresh Token 被用作 Access Token
4. **過期時間驗證**：每次都檢查 exp claim

#### Q3: "如果 Token 被偷了怎麼辦？"

**回答要點：**
1. **Access Token 快速過期**：只有 15 分鐘時間窗口
2. **HttpOnly Cookie**：Refresh Token 無法被 JavaScript 讀取（防 XSS）
3. **HTTPS Only**：所有通訊加密
4. **可以實作 Token 黑名單**：在 Redis 中記錄已撤銷的 token

---

**下一部分將包含：**
- JWKS 詳細說明
- 微服務間的 JWT 驗證
- Public Key 分發機制

這是第一部分，涵蓋了 JWT 的基礎概念和你專案中的實作。需要我繼續下一部分嗎？

---

## 4. JWKS (JSON Web Key Set)

### 4.1 什麼是 JWKS？

JWKS 是一個 **JSON 格式的公鑰集合**，用於驗證 JWT 簽名。

#### 為什麼需要 JWKS？

在微服務架構中：
- ❌ **不好的做法**：把私鑰複製到每個服務
- ✅ **好的做法**：只有 auth service 有私鑰，其他服務從 JWKS endpoint 獲取公鑰

### 4.2 JWKS 結構

```json
{
  "keys": [
    {
      "kty": "RSA",                    // Key Type
      "use": "sig",                    // Public Key Use (signature)
      "kid": "user-access-key",        // Key ID
      "n": "xGOr-H7A...",              // RSA Modulus (Base64 encoded)
      "e": "AQAB"                      // RSA Exponent
    },
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "user-refresh-key",
      "n": "yHPs-K8B...",
      "e": "AQAB"
    }
  ]
}
```

### 4.3 專案中的 JWKS 實作

#### Auth Service 提供 JWKS Endpoint

```
GET http://backend-auth:3000/.well-known/jwks.json
```

回傳範例：
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "user-access-key",
      "n": "base64_encoded_modulus...",
      "e": "AQAB"
    }
  ]
}
```

### 4.4 微服務架構中的 JWT 驗證流程

```
┌─────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Browser │      │   API    │      │   Game   │      │   Auth   │
│         │      │ Gateway  │      │  Service │      │  Service │
└────┬────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                │                  │                  │
     │ 1. Request     │                  │                  │
     │   + JWT        │                  │                  │
     │───────────────>│                  │                  │
     │                │                  │                  │
     │                │ 2. Forward       │                  │
     │                │   + JWT          │                  │
     │                │─────────────────>│                  │
     │                │                  │                  │
     │                │                  │ 3. First time?   │
     │                │                  │    Fetch JWKS    │
     │                │                  │─────────────────>│
     │                │                  │                  │
     │                │                  │ 4. Return JWKS   │
     │                │                  │<─────────────────│
     │                │                  │                  │
     │                │                  │ 5. Verify JWT    │
     │                │                  │    with Public   │
     │                │                  │    Key from JWKS │
     │                │                  │                  │
     │                │ 6. Response      │                  │
     │                │<─────────────────│                  │
     │                │                  │                  │
     │ 7. Response    │                  │                  │
     │<───────────────│                  │                  │
```

### 4.5 JWT Verifier Service 實作

位置：`srcs/backend/game/src/services/JwtVerifierService.ts`

```typescript
class JwtVerifierService {
  private jwksCache: JWKS | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 3600000; // 1 小時

  /**
   * 步驟 1: 從 Auth Service 取得 JWKS
   */
  private async fetchJWKS(): Promise<JWKS> {
    const response = await fetch(
      `${this.AUTH_SERVICE_URL}/.well-known/jwks.json`
    );
    
    if (!response.ok) {
      throw new Error(`JWKS fetch failed: ${response.status}`);
    }
    
    return await response.json() as JWKS;
  }

  /**
   * 步驟 2: 使用 Cache 減少請求
   */
  private async getJWKS(): Promise<JWKS> {
    const now = Date.now();
    
    // 如果 cache 還有效，直接返回
    if (this.jwksCache && now < this.cacheExpiry) {
      return this.jwksCache;
    }
    
    // 否則重新獲取
    this.jwksCache = await this.fetchJWKS();
    this.cacheExpiry = now + this.CACHE_DURATION;
    
    return this.jwksCache;
  }

  /**
   * 步驟 3: 從 JWKS 中找到對應的公鑰
   */
  private getPublicKeyFromJWKS(
    jwks: JWKS, 
    kid: string
  ): string {
    const key = jwks.keys.find(k => k.kid === kid);
    
    if (!key) {
      throw new Error(`Key with kid ${kid} not found in JWKS`);
    }
    
    // 將 JWK 格式轉換為 PEM 格式
    return this.jwkToPem(key);
  }

  /**
   * 步驟 4: 驗證 JWT
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    // 解碼 header 取得 kid
    const header = jwt.decode(token, { complete: true })?.header;
    if (!header || !header.kid) {
      throw new Error('Invalid token: missing kid');
    }
    
    // 取得 JWKS
    const jwks = await this.getJWKS();
    
    // 取得對應的公鑰
    const publicKey = this.getPublicKeyFromJWKS(jwks, header.kid);
    
    // 驗證 token
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
    }) as TokenPayload;
    
    return decoded;
  }
}
```

### 4.6 為什麼使用 JWKS？

#### 優點：

1. **安全性**
   - 私鑰只在 auth service
   - 其他服務只需要公鑰
   - 即使服務被攻破，私鑰也安全

2. **可擴展性**
   - 新服務只需要知道 JWKS endpoint
   - 不需要分發密鑰

3. **密鑰輪換 (Key Rotation)**
   - 可以定期更換密鑰
   - JWKS 支持多個公鑰（舊的和新的同時存在）
   - 平滑過渡，不影響現有 token

4. **標準化**
   - 符合 OAuth 2.0 和 OpenID Connect 標準
   - 與第三方服務（如 Google OAuth）一致

### 4.7 Cache 機制

```typescript
// Cache 流程
┌─────────────────────────────────────┐
│ 其他微服務需要驗證 JWT                │
└──────────────┬──────────────────────┘
               │
               ▼
       ┌───────────────┐
       │ Cache valid?  │
       └───┬───────┬───┘
           │       │
      YES  │       │  NO
           │       │
           ▼       ▼
    ┌──────────┐  ┌────────────────┐
    │ Use      │  │ Fetch new JWKS │
    │ cached   │  │ from auth      │
    │ JWKS     │  │ service        │
    └─────┬────┘  └────────┬───────┘
          │                │
          │                │
          └─────┬──────────┘
                │
                ▼
        ┌─────────────────┐
        │ Verify JWT      │
        │ locally using   │
        │ public key      │
        │                 │
        │ Update cache    │
        │                 │
        │ Set expiry time │
        └─────────────────┘
```

#### 為什麼需要 Cache？

- **減少網路請求**：不用每次都問 auth service
- **提升性能**：本地驗證更快
- **降低負載**：減輕 auth service 壓力
- **容錯性**：auth service 暫時不可用時，仍可驗證（在 cache 有效期內）

---

## 📝 Evaluation Defense - Part 2

### 評審可能問的問題：

#### Q4: "什麼是 JWKS？為什麼要用它？"

**回答要點：**
1. **定義**：JSON Web Key Set，是一組公鑰的 JSON 表示
2. **用途**：讓其他服務可以驗證 JWT，而不需要知道私鑰
3. **安全**：私鑰只在 auth service，其他服務只有公鑰
4. **標準**：符合 OAuth 2.0 / OpenID Connect 標準

#### Q5: "微服務之間如何驗證 JWT？"

**回答要點：**
1. **集中簽發**：只有 auth service 可以簽發 JWT
2. **分散驗證**：每個服務都可以獨立驗證
3. **JWKS endpoint**：所有服務從 `/.well-known/jwks.json` 獲取公鑰
4. **Cache 機制**：公鑰會 cache 1小時，減少請求

#### Q6: "如果想要撤銷一個 JWT 怎麼辦？"

**回答要點：**
1. **短期 Access Token**：只有 15 分鐘，自然過期很快
2. **Refresh Token 可控**：可以在數據庫中標記為已撤銷
3. **可選：Token 黑名單**：
   - 在 Redis 中維護已撤銷的 token ID (jti claim)
   - 驗證時檢查黑名單
   - 過期後自動清除黑名單條目

示例實作（可選）：
```typescript
// 檢查 token 是否在黑名單
async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const exists = await redis.exists(`blacklist:${jti}`);
  return exists === 1;
}

// 撤銷 token
async function revokeToken(token: string): Promise<void> {
  const decoded = jwt.decode(token) as TokenPayload;
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  
  // 在 Redis 中存儲，TTL 設為 token 剩餘時間
  await redis.setex(`blacklist:${decoded.jti}`, ttl, '1');
}
```

#### Q7: "如何處理密鑰輪換 (Key Rotation)？"

**回答要點：**
1. **JWKS 支持多個 key**：可以同時有舊的和新的公鑰
2. **使用 kid (Key ID)**：每個 key 有唯一 ID
3. **平滑過渡**：
   - 生成新密鑰對，添加到 JWKS
   - 新 token 用新私鑰簽名，標記新 kid
   - 舊 token 仍可用舊公鑰驗證
   - 等所有舊 token 過期後，移除舊公鑰

```typescript
// JWKS 支持多個 key
{
  "keys": [
    {
      "kid": "key-2024-10",  // 舊的 key
      "kty": "RSA",
      ...
    },
    {
      "kid": "key-2024-11",  // 新的 key
      "kty": "RSA",
      ...
    }
  ]
}
```

---

**第二部分完成！下一部分將涵蓋：**
- Google OAuth 整合流程
- OAuth 2.0 原理
- 第三方登入安全性

繼續嗎？

---

## 5. Google OAuth 整合

### 5.1 什麼是 OAuth 2.0？

OAuth 2.0 是一個**授權框架 (Authorization Framework)**，允許用戶授權第三方應用訪問他們在其他服務上的資源，而不需要分享密碼。

#### 為什麼需要 OAuth？

**問題場景：**
假設你的 Pong 遊戲想讓用戶用 Google 帳號登入：

❌ **不好的做法：**
```
你的網站：「請輸入你的 Google 帳號和密碼」
用戶：輸入 google@example.com 和密碼
你的網站：拿這個密碼去 Google 登入
```

**問題：**
- 用戶必須信任你不會濫用他的 Google 密碼
- 你要負責保管 Google 密碼（風險很大）
- Google 無法控制你的訪問權限

✅ **OAuth 的做法：**
```
你的網站：「請用 Google 登入」
用戶：被導向 Google 的登入頁面
Google：用戶在 Google 登入，授權你的網站訪問基本資料
Google：給你一個 access token
你的網站：用 token 向 Google 要用戶資料
```

**優點：**
- 用戶的密碼永遠不會給你
- Google 控制授權範圍
- 可以隨時撤銷授權

### 5.2 OAuth 2.0 授權流程 (Authorization Code Flow)

這是你專案使用的流程，最安全的 OAuth 方式：

```
┌─────────┐              ┌─────────┐              ┌─────────┐
│ Browser │              │  Your   │              │ Google  │
│         │              │  App    │              │         │
└────┬────┘              └────┬────┘              └────┬────┘
     │                        │                        │
     │ 1. Click "Login with Google"                    │
     │───────────────────────>│                        │
     │                        │                        │
     │ 2. Redirect to Google with Client ID & Scope    │
     │                        │───────────────────────>│
     │                                                 │
     │ 3. Google Login Page                            │
     │<────────────────────────────────────────────────│
     │                                                 │
     │ 4. User logs in and authorizes                  │
     │────────────────────────────────────────────────>│
     │                                                 │
     │ 5. Redirect back with Authorization Code        │
     │<────────────────────────────────────────────────│
     │                        │                        │
     │ 6. Send code to backend                         │
     │───────────────────────>│                        │
     │                        │                        │
     │                        │ 7. Exchange code for   │
     │                        │    tokens (with secret)│
     │                        │───────────────────────>│
     │                        │                        │
     │                        │ 8. Access Token +      │
     │                        │    ID Token            │
     │                        │<───────────────────────│
     │                        │                        │
     │                        │ 9. Get user info       │
     │                        │───────────────────────>│
     │                        │                        │
     │                        │ 10. User profile       │
     │                        │<───────────────────────│
     │                        │                        │
     │ 11. Your app's JWT     │                        │
     │<───────────────────────│                        │
```

### 5.3 專案中的 Google OAuth 實作

#### 步驟 1: 前端 - 發起 OAuth 流程

位置：`srcs/frontend/src/scripts/auth/login.ts`

```typescript
// 點擊 "Login with Google" 按鈕
googleLoginBtn.addEventListener('click', async () => {
  // 1. 向後端請求 Google OAuth 配置
  const configResponse = await fetch('/api/auth/google/config');
  const config = await configResponse.json();
  
  const { clientId, redirectUri } = config;
  
  // 2. 構建 Google OAuth URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.append('client_id', clientId);
  googleAuthUrl.searchParams.append('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.append('response_type', 'code');
  googleAuthUrl.searchParams.append('scope', 'openid profile email');
  googleAuthUrl.searchParams.append('access_type', 'offline');
  
  // 3. 導向 Google 登入頁面
  window.location.href = googleAuthUrl.toString();
});
```

#### 步驟 2: Google 回調處理

用戶在 Google 登入並授權後，會被導回：
```
https://localhost:4443/auth/google/callback?code=4/0AbCD...xyz
```

前端接收 code 並發送到後端：

```typescript
// 從 URL 取得 authorization code
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

// 發送到後端交換 token
const response = await fetch('/api/auth/google', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code })
});
```

#### 步驟 3: 後端 - 交換 Token 並獲取用戶資料

位置：`srcs/backend/auth/src/routes/oauth.routes.ts`

```typescript
fastify.post('/', async (request, reply) => {
  const { code } = request.body;
  
  // 1. 用 authorization code 換取 access token
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  
  // tokens 包含:
  // {
  //   access_token: "ya29.a0...",
  //   id_token: "eyJhbG...",
  //   refresh_token: "1//...",
  //   expiry_date: 1234567890
  // }
  
  // 2. 使用 access token 獲取用戶資料
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  
  // data 包含:
  // {
  //   id: "123456789",           // Google Sub (唯一識別碼)
  //   email: "user@gmail.com",
  //   name: "John Doe",
  //   given_name: "John",
  //   picture: "https://..."
  // }
  
  // 3. 檢查用戶是否已存在
  let user = await usersClient.getUserByGoogleSub(data.id);
  
  if (!user) {
    // 首次登入，需要選擇用戶名
    const tempToken = await jwtService.generateTempToken({
      google_sub: data.id,
      google_name: data.given_name,
      google_email: data.email,
      avatar_url: data.picture
    }, "google_oauth", 600);  // 10 分鐘
    
    return reply.code(202).send({
      step: "choose_username",
      temp_token: tempToken
    });
  }
  
  // 4. 檢查是否啟用 2FA
  const twoFAStatus = await usersClient.get2FAStatus(user.user_id);
  
  if (twoFAStatus.enabled) {
    // 需要 2FA 驗證
    const tempToken = await jwtService.generateTempToken({
      user_id: user.user_id,
      requires_2fa: true
    }, "2fa_pending", 300);  // 5 分鐘
    
    return reply.code(200).send({
      success: true,
      requires_2fa: true,
      temp_token: tempToken
    });
  }
  
  // 5. 生成你自己的 JWT
  const { accessToken, refreshToken } = 
    await jwtService.generateTokens(user.user_id);
  
  // 6. 設置 cookies
  authUtils.ft_setCookie(reply, accessToken, 15 * 60, 'access');
  authUtils.ft_setCookie(reply, refreshToken, 7 * 24 * 60 * 60, 'refresh');
  
  return reply.code(200).send({
    success: true,
    user_id: user.user_id,
    username: user.username
  });
});
```

#### 步驟 4: 首次登入 - 選擇用戶名

如果是新用戶，需要額外一步：

```typescript
fastify.post("/username", async (request, reply) => {
  const { username, temp_token } = request.body;
  
  // 1. 驗證臨時 token
  const payload = await authService.verifyTempToken(temp_token);
  
  if (!payload.valid) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
  
  const { google_sub, google_email, avatar_url } = payload.payload;
  
  // 2. 創建新用戶
  const newUser = await usersClient.createGoogleUser({
    username,
    google_sub,
    email: google_email,
    avatar_url
  });
  
  // 3. 生成 JWT
  const { accessToken, refreshToken } = 
    await jwtService.generateTokens(newUser.user_id);
  
  // 4. 返回 tokens
  authUtils.ft_setCookie(reply, accessToken, 15 * 60, 'access');
  authUtils.ft_setCookie(reply, refreshToken, 7 * 24 * 60 * 60, 'refresh');
  
  return reply.code(200).send({ success: true });
});
```

### 5.4 完整流程圖（包含特殊情況）

```
User clicks "Login with Google"
         │
         ▼
    ┌─────────────────┐
    │ Redirect to     │
    │ Google Login    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ User authorizes │
    │ at Google       │
    └────────┬────────┘
             │
             ▼
    ┌──────────────────┐
    │ Get auth code    │
    │ Send to backend  │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Exchange code    │
    │ for Google token │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Get user info    │
    │ from Google      │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ User exists?     │
    └────┬─────────┬───┘
         │YES      │NO
         │         │
         │         ▼
         │    ┌────────────────┐
         │    │ Return temp    │
         │    │ token, ask for │
         │    │ username       │
         │    └────┬───────────┘
         │         │
         │         ▼
         │    ┌────────────────┐
         │    │ User submits   │
         │    │ username       │
         │    └────┬───────────┘
         │         │
         │         ▼
         │    ┌────────────────┐
         │    │ Create new     │
         │    │ user in DB     │
         │    └────┬───────────┘
         │         │
         └─────────┘
             │
             ▼
    ┌──────────────────┐
    │ 2FA enabled?     │
    └────┬─────────┬───┘
         │YES      │NO
         │         │
         │         └──────────┐
         │                    │
         ▼                    │
    ┌────────────────┐        │
    │ Return temp    │        │
    │ token, ask for │        │
    │ 2FA code       │        │
    └────┬───────────┘        │
         │                    │
         ▼                    │
    ┌────────────────┐        │
    │ User submits   │        │
    │ 2FA code       │        │
    └────┬───────────┘        │
         │                    │
         └────────────────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Generate YOUR    │
         │ app's JWT        │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Set cookies      │
         │ Login success!   │
         └──────────────────┘
```

### 5.5 安全性考量

#### 5.5.1 為什麼使用 Authorization Code Flow？

OAuth 2.0 有多種流程，你的專案使用最安全的 **Authorization Code Flow**：

**其他流程（不安全）：**

1. **Implicit Flow**（已廢棄）
   ```
   Google 直接返回 access token 在 URL 中
   https://yourapp.com/#access_token=ya29...
   ```
   ❌ **問題**：Token 暴露在瀏覽器歷史記錄和日誌中

2. **Resource Owner Password Credentials**
   ```
   用戶直接給你 Google 密碼
   ```
   ❌ **問題**：違背 OAuth 初衷

**Authorization Code Flow（你使用的）：**
```
1. Google 返回一個 code（不是 token）
2. Code 發送到你的後端
3. 後端用 code + client_secret 換 token
4. Token 不會暴露給前端
```

✅ **優點**：
- Client Secret 安全存在後端
- Token 不經過瀏覽器
- 即使 code 被攔截，沒有 secret 也無法使用

#### 5.5.2 Temporary Token 策略

你的專案用臨時 token 處理中間狀態：

```typescript
// Google OAuth 完成，但需要選用戶名
const tempToken = jwtService.generateTempToken({
  google_sub: "123456789",
  google_name: "John",
  google_email: "john@gmail.com"
}, "google_oauth", 600);  // 只有 10 分鐘有效

// 這個 token:
// ✅ 短期有效（10 分鐘）
// ✅ 只能用一次（驗證後刪除）
// ✅ 包含創建用戶所需的最少資訊
// ✅ 不能用來訪問 API
```

#### 5.5.3 State Parameter（防 CSRF）

雖然你的代碼中沒有明顯看到，但生產環境應該加上：

```typescript
// 發起 OAuth 前，生成隨機 state
const state = crypto.randomBytes(16).toString('hex');
await redis.setex(`oauth_state:${state}`, 600, '1');

const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
googleAuthUrl.searchParams.append('state', state);  // 加上 state

// Google 回調時會帶回這個 state
// 驗證 state 是否匹配，防止 CSRF 攻擊
const returnedState = urlParams.get('state');
const exists = await redis.exists(`oauth_state:${returnedState}`);
if (!exists) {
  throw new Error('Invalid state - possible CSRF attack');
}
```

### 5.6 Google OAuth 配置

你需要在 Google Cloud Console 設置：

```bash
# 1. 創建 OAuth 2.0 Client ID
Client ID: 123456-abc.apps.googleusercontent.com
Client Secret: GOCSPX-xyz123...

# 2. 設置授權重定向 URI
Authorized redirect URIs:
  https://localhost:4443/auth/google/callback
  https://yourdomain.com/auth/google/callback

# 3. 設置授權 JavaScript origins
Authorized JavaScript origins:
  https://localhost:4443
  https://yourdomain.com
```

環境變數設置（`secrets/google-oauth.env`）：

```bash
GOOGLE_CLIENT_ID=123456-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xyz123...
GOOGLE_REDIRECT_URI=https://localhost:4443/auth/google/callback
```

---

## 📝 Evaluation Defense - Part 3

### 評審可能問的問題：

#### Q8: "什麼是 OAuth？為什麼要用它？"

**回答要點：**
1. **定義**：OAuth 2.0 是授權框架，不是認證協議
2. **目的**：讓用戶授權第三方應用訪問他們的資源，而不需要分享密碼
3. **好處**：
   - 用戶不用記額外密碼
   - 你不用處理密碼安全
   - Google 控制訪問權限
4. **用途**：我們用 Google OAuth 讓用戶用 Google 帳號登入

#### Q9: "OAuth 流程是怎樣的？"

**回答要點（用簡單語言）：**
1. 用戶點「用 Google 登入」
2. 我們導向 Google 登入頁面（帶著我們的 Client ID）
3. 用戶在 Google 登入並授權
4. Google 給我們一個 authorization code
5. 我們用 code + client secret 向 Google 換 access token
6. 用 access token 向 Google 要用戶資料
7. 建立或更新我們數據庫中的用戶
8. 生成我們自己的 JWT 給用戶

**可以畫圖說明 5.2 的流程圖**

#### Q10: "為什麼不直接用 Google 的 token？為什麼還要生成自己的 JWT？"

**回答要點：**
1. **控制權**：Google token 的過期時間和內容我們無法控制
2. **統一性**：不管是本地登入還是 Google 登入，都用同一套 JWT 系統
3. **彈性**：可以在 JWT 中加入我們需要的自定義資訊（遊戲權限等）
4. **安全性**：Google token 只用一次（換資料時），之後用我們自己的 token
5. **離線使用**：不需要每次都向 Google 驗證

#### Q11: "如果 Google 的 access token 被偷了怎麼辦？"

**回答要點：**
1. **短暫使用**：我們只在後端用一次（獲取用戶資料）
2. **不存儲**：不會儲存 Google 的 access token
3. **立即丟棄**：用完就丟，換成我們自己的 JWT
4. **作用域限制**：只請求必要的權限（openid, profile, email）
5. **後端處理**：Token 從不暴露給前端

#### Q12: "首次登入時為什麼要選用戶名？"

**回答要點：**
1. **唯一性**：Google email 可能變更，但我們需要穩定的用戶名
2. **隱私**：用戶可能不想用 email 作為顯示名稱
3. **遊戲體驗**：排行榜等功能需要顯示名稱
4. **臨時 token**：用臨時 token 保存 Google 資料，讓用戶選完用戶名後才創建帳號

---

**第三部分完成！下一部分將涵蓋：**
- Two-Factor Authentication (2FA)
- TOTP 原理
- 2FA 設置和驗證流程

繼續嗎？

---

## 6. Two-Factor Authentication (2FA)

### 6.1 什麼是 2FA？

2FA (Two-Factor Authentication) 是一種**雙因素驗證**機制，要求用戶提供兩種不同類型的證明：

1. **Something you know（你知道的東西）**：密碼
2. **Something you have（你擁有的東西）**：手機上的驗證碼

#### 為什麼需要 2FA？

**場景：**
```
❌ 只有密碼：
  駭客偷到密碼 → 登入成功 ✓

✅ 密碼 + 2FA：
  駭客偷到密碼 → 還需要手機驗證碼 → 登入失敗 ✗
```

**統計數據：**
- 2FA 可以阻擋 **99.9%** 的自動攻擊
- 即使密碼洩漏，帳號仍然安全

### 6.2 TOTP (Time-based One-Time Password)

你的專案使用 **TOTP**，這是最常見的 2FA 實作方式。

#### TOTP 原理

```
Server                          User's Phone
  │                                  │
  │  1. 生成 Secret (一次性)          │
  │  ──────────────────────────────> │
  │                                  │
  │                                  │  2. 存儲 Secret
  │                                  │     在 Authenticator App
  │                                  │
  │  3. 每 30 秒，用 Secret           │  3. 每 30 秒，用同樣的
  │     + 當前時間生成 6 位數字        │     Secret + 當前時間
  │                                  │     生成 6 位數字
  │     例如：123456                  │     例如：123456
  │                                  │
  │  4. 用戶輸入驗證碼                 │
  │  <──────────────────────────────  │
  │                                  │
  │  5. 比對兩邊生成的數字             │
  │     123456 == 123456? ✓          │
```

#### TOTP 算法

```typescript
function generateTOTP(secret: string, time: number): string {
  // 1. 時間步長（每 30 秒一個週期）
  const timeStep = Math.floor(time / 30);
  
  // 2. HMAC-SHA1 哈希
  const hmac = crypto.createHmac('sha1', base32Decode(secret));
  hmac.update(Buffer.from(timeStep.toString(16).padStart(16, '0'), 'hex'));
  const hash = hmac.digest();
  
  // 3. 動態截斷 (Dynamic Truncation)
  const offset = hash[hash.length - 1] & 0x0f;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % 1000000;
  
  // 4. 補零到 6 位數
  return code.toString().padStart(6, '0');
}
```

**關鍵點：**
- **時間同步**：Server 和 App 的時間必須一致（通常允許 ±1 個時間步長的誤差）
- **Secret 永不傳輸**：初始化後，secret 永遠不會再在網路上傳輸
- **每 30 秒變化**：即使駭客截獲驗證碼，30 秒後就失效

### 6.3 專案中的 2FA 實作

#### 完整流程圖

```
┌──────────────────────────────────────────────────────────────┐
│                    2FA 設置流程                               │
└──────────────────────────────────────────────────────────────┘

User (已登入)
    │
    ▼
┌─────────────────┐
│ 點擊「啟用 2FA」 │
└────────┬────────┘
         │
         ▼
    ┌────────────────────┐
    │ POST /2fa/setup    │
    │ (with JWT)         │
    └─────────┬──────────┘
              │
              ▼
    ┌──────────────────────────┐
    │ Server:                  │
    │ 1. 生成 Secret           │
    │ 2. 暫存在 Redis (10min)  │
    │ 3. 生成 QR Code          │
    └─────────┬────────────────┘
              │
              ▼
    ┌──────────────────────┐
    │ 返回 QR Code         │
    │ (Data URL)           │
    └─────────┬────────────┘
              │
              ▼
    ┌──────────────────────┐
    │ User: 用手機掃描      │
    │ QR Code              │
    └─────────┬────────────┘
              │
              ▼
    ┌──────────────────────────┐
    │ Authenticator App 存儲   │
    │ Secret 並生成驗證碼       │
    └─────────┬────────────────┘
              │
              ▼
    ┌──────────────────────┐
    │ User 輸入 6 位驗證碼  │
    └─────────┬────────────┘
              │
              ▼
    ┌────────────────────────┐
    │ POST /2fa/activate     │
    │ { token: "123456" }    │
    └─────────┬──────────────┘
              │
              ▼
    ┌──────────────────────────┐
    │ Server:                  │
    │ 1. 從 Redis 取 Secret    │
    │ 2. 驗證 token            │
    │ 3. 存入 Database         │
    │ 4. 刪除 Redis 臨時資料    │
    └─────────┬────────────────┘
              │
              ▼
    ┌──────────────────┐
    │ 2FA 啟用成功！    │
    └──────────────────┘


┌──────────────────────────────────────────────────────────────┐
│                    2FA 登入流程                               │
└──────────────────────────────────────────────────────────────┘

User
    │
    ▼
┌──────────────────────┐
│ 輸入帳號密碼          │
└─────────┬────────────┘
          │
          ▼
    ┌────────────────┐
    │ POST /login    │
    └─────────┬──────┘
              │
              ▼
    ┌──────────────────────┐
    │ Server:              │
    │ 1. 驗證密碼           │
    │ 2. 檢查 2FA 狀態      │
    └─────────┬────────────┘
              │
         ┌────┴────┐
         │         │
    NO 2FA    YES 2FA
         │         │
         │         ▼
         │    ┌──────────────────┐
         │    │ 生成臨時 Token    │
         │    │ (temp_token)     │
         │    └─────────┬────────┘
         │              │
         │              ▼
         │    ┌──────────────────────┐
         │    │ 返回 202 Accepted     │
         │    │ { step: "2fa_required",
         │    │   temp_token: "..." } │
         │    └─────────┬────────────┘
         │              │
         │              ▼
         │    ┌──────────────────────┐
         │    │ User 打開            │
         │    │ Authenticator App    │
         │    │ 查看驗證碼            │
         │    └─────────┬────────────┘
         │              │
         │              ▼
         │    ┌──────────────────────┐
         │    │ 輸入 6 位驗證碼       │
         │    └─────────┬────────────┘
         │              │
         │              ▼
         │    ┌──────────────────────────┐
         │    │ POST /2fa/verify         │
         │    │ { token: "123456",       │
         │    │   temp_token: "..." }    │
         │    └─────────┬────────────────┘
         │              │
         │              ▼
         │    ┌──────────────────────┐
         │    │ Server:              │
         │    │ 1. 驗證 temp_token   │
         │    │ 2. 驗證 TOTP         │
         │    │ 3. 生成真正的 JWT     │
         │    └─────────┬────────────┘
         │              │
         └──────────────┘
                   │
                   ▼
         ┌──────────────────┐
         │ 登入成功！        │
         │ 返回 JWT          │
         └──────────────────┘
```

### 6.4 代碼實作詳解

#### 步驟 1: 設置 2FA

位置：`srcs/backend/auth/src/routes/twofa.routes.ts`

```typescript
// POST /api/auth/2fa/setup
fastify.post('/setup', {
  preHandler: userSessionMiddleware  // 必須已登入
}, async (request, reply) => {
  const userId = (request as any).user.userId;
  
  // 1. 檢查是否已啟用 2FA
  const twoFAStatus = await usersClient.get2FAStatus(userId);
  if (twoFAStatus.enabled) {
    return reply.code(400).send({ 
      error: "2FA is already enabled." 
    });
  }
  
  // 2. 生成 Secret (使用 speakeasy 庫)
  const secret = speakeasy.generateSecret({
    name: `ft_transcendence (${userId})`,  // 在 App 中顯示的名稱
    issuer: 'ft_transcendence'              // 發行者
  });
  
  // secret 對象包含:
  // {
  //   ascii: "ab3d ef45 ...",      // ASCII 格式
  //   hex: "61623364...",           // Hex 格式
  //   base32: "MFRGG...",           // Base32 格式（最常用）
  //   otpauth_url: "otpauth://..."  // QR Code URL
  // }
  
  // 3. 暫存 Secret 在 Redis（10 分鐘有效）
  await redis.setex(`2fa_setup_${userId}`, 600, secret.base32);
  
  // 4. 生成 QR Code
  const qrCode = await qrcode.toDataURL(secret.otpauth_url!);
  
  // qrCode 是一個 Data URL:
  // "data:image/png;base64,iVBORw0KGgoAAAANS..."
  
  return reply.send({
    success: true,
    qrCode,              // 前端可以直接用 <img src={qrCode} />
    secret: secret.base32,
    otpauth_url: secret.otpauth_url
  });
});
```

**QR Code 中的內容：**
```
otpauth://totp/ft_transcendence%20(123)?secret=MFRGG...&issuer=ft_transcendence
```

- **otpauth://** - 協議
- **totp** - 類型（Time-based OTP）
- **ft_transcendence (123)** - 帳號標識
- **secret=MFRGG...** - Base32 編碼的 secret
- **issuer=ft_transcendence** - 發行者

#### 步驟 2: 激活 2FA

```typescript
// POST /api/auth/2fa/activate
fastify.post("/activate", {
  preHandler: userSessionMiddleware
}, async (request, reply) => {
  const userId = (request as any).user.userId;
  const { token } = request.body;  // 用戶輸入的 6 位數字
  
  // 1. 從 Redis 獲取暫存的 Secret
  const secret = await redis.get(`2fa_setup_${userId}`);
  if (!secret) {
    return reply.code(400).send({ 
      error: "2FA setup expired. Please start setup again." 
    });
  }
  
  // 2. 驗證用戶輸入的 token
  const isValid = speakeasy.totp.verify({
    secret,              // Base32 編碼的 secret
    encoding: 'base32',
    token,               // 用戶輸入的 6 位數字
    window: 1            // 允許前後 1 個時間步長（±30秒）
  });
  
  if (!isValid) {
    return reply.code(400).send({ 
      error: "Invalid verification code." 
    });
  }
  
  // 3. 驗證成功，將 Secret 永久存入數據庫
  await usersClient.update2FASettings(userId, true, secret);
  
  // 4. 刪除 Redis 中的臨時 Secret
  await redis.del(`2fa_setup_${userId}`);
  
  return reply.send({ 
    success: true, 
    message: "2FA successfully activated." 
  });
});
```

#### 步驟 3: 登入時驗證 2FA

```typescript
// POST /api/auth/2fa/verify
fastify.post("/verify", async (request, reply) => {
  const { token: twofaCode, temp_token } = request.body;
  
  // 1. 驗證臨時 token（登入時生成的）
  const payload = await authService.verifyTempToken(temp_token);
  if (!payload.valid) {
    return reply.code(400).send({ 
      error: 'Invalid or expired temp token.' 
    });
  }
  
  const userId = (payload.payload as any).userId;
  
  // 2. 從數據庫獲取用戶的 2FA Secret
  const twoFAStatus = await usersClient.get2FAStatus(userId);
  
  if (!twoFAStatus.enabled || !twoFAStatus.secret) {
    return reply.code(400).send({ 
      error: "2FA is not enabled for this user." 
    });
  }
  
  // 3. 驗證 TOTP 碼
  const isValid = speakeasy.totp.verify({
    secret: twoFAStatus.secret,
    encoding: 'base32',
    token: twofaCode
  });
  
  if (!isValid) {
    return reply.code(400).send({ 
      error: "Invalid 2FA code." 
    });
  }
  
  // 4. 驗證成功，生成正式的 JWT
  const { accessToken, refreshToken } = 
    await jwtService.generateTokens(userId);
  
  // 5. 設置 cookies
  authUtils.ft_setCookie(reply, accessToken, 15 * 60, 'access');
  authUtils.ft_setCookie(reply, refreshToken, 7 * 24 * 60 * 60, 'refresh');
  
  return reply.send({
    success: true,
    message: "2FA verification successful."
  });
});
```

### 6.5 安全性考量

#### 6.5.1 Secret 的保護

```typescript
// ❌ 錯誤做法：Secret 明文存儲
await db.query(
  'UPDATE users SET two_fa_secret = ? WHERE id = ?',
  [secret, userId]
);

// ✅ 你的做法：雖然 Base32，但應該考慮加密
// 更好的做法是加密存儲：
const encrypted = encrypt(secret, ENCRYPTION_KEY);
await db.query(
  'UPDATE users SET two_fa_secret = ? WHERE id = ?',
  [encrypted, userId]
);
```

#### 6.5.2 時間窗口

```typescript
speakeasy.totp.verify({
  secret,
  token,
  window: 1  // ±30 秒的容差
});

// window 解釋：
// - 當前時間步長：T
// - 檢查 T-1, T, T+1 三個時間步長的碼
// - 允許時鐘稍有偏差
```

**為什麼需要 window？**
- Server 和手機的時鐘可能略有差異
- 用戶可能在碼即將過期時輸入
- window=1 是安全性和用戶體驗的平衡

#### 6.5.3 重放攻擊防護

雖然你的代碼沒有明確實作，但可以加上：

```typescript
// 記錄最近使用過的 token
const lastUsedToken = await redis.get(`2fa_last_${userId}`);
if (lastUsedToken === twofaCode) {
  return reply.code(400).send({ 
    error: "This code has already been used." 
  });
}

// 驗證成功後記錄
await redis.setex(`2fa_last_${userId}`, 60, twofaCode);
```

#### 6.5.4 備用碼（Recovery Codes）

生產環境應該提供備用碼，防止用戶丟失手機：

```typescript
// 生成 10 組備用碼
function generateRecoveryCodes(): string[] {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex'));
  }
  return codes;
}

// 激活 2FA 時一起生成
const recoveryCodes = generateRecoveryCodes();
await usersClient.saveRecoveryCodes(userId, recoveryCodes);

// 返回給用戶（只顯示一次！）
return reply.send({
  success: true,
  recoveryCodes  // ["a3b4c5d6", "e7f8g9h0", ...]
});
```

### 6.6 常見的 Authenticator Apps

用戶可以使用這些 App 掃描 QR Code：

1. **Google Authenticator** (iOS/Android)
2. **Microsoft Authenticator** (iOS/Android)
3. **Authy** (iOS/Android/Desktop)
4. **1Password** (付費，但功能強大)

所有這些 App 都遵循同樣的 TOTP 標準（RFC 6238）。

### 6.7 禁用 2FA

```typescript
// POST /api/auth/2fa/disable
fastify.post("/disable", {
  preHandler: userSessionMiddleware
}, async (request, reply) => {
  const userId = (request as any).user.userId;
  
  // 檢查是否已啟用
  const twoFAStatus = await usersClient.get2FAStatus(userId);
  if (!twoFAStatus.enabled) {
    return reply.code(400).send({ 
      error: "2FA is not enabled." 
    });
  }
  
  // 禁用 2FA
  await usersClient.update2FASettings(userId, false, null);
  
  return reply.send({ 
    success: true, 
    message: "2FA has been disabled." 
  });
});
```

**注意：** 生產環境應該要求用戶：
1. 輸入密碼確認
2. 或輸入當前的 2FA 碼確認
3. 防止攻擊者在用戶離開電腦時禁用 2FA

---

## 📝 Evaluation Defense - Part 4

### 評審可能問的問題：

#### Q13: "什麼是 2FA？為什麼要實作它？"

**回答要點：**
1. **定義**：Two-Factor Authentication，雙因素驗證
2. **兩個因素**：
   - Something you know (密碼)
   - Something you have (手機驗證碼)
3. **安全性**：即使密碼洩漏，沒有手機也無法登入
4. **統計**：可以阻擋 99.9% 的自動攻擊

#### Q14: "TOTP 是怎麼運作的？"

**回答要點（用簡單語言）：**
1. **初始化**：Server 和手機共享一個 Secret（只傳輸一次）
2. **生成驗證碼**：
   - 每 30 秒，雙方用同樣的算法
   - 用 Secret + 當前時間 生成 6 位數字
3. **驗證**：Server 比對雙方生成的數字是否相同
4. **安全性**：Secret 永不再傳輸，驗證碼每 30 秒變化

**可以展示這個算法：**
```
驗證碼 = HMAC-SHA1(Secret, CurrentTime / 30秒) % 1,000,000
```

#### Q15: "為什麼用 QR Code 傳輸 Secret？"

**回答要點：**
1. **方便性**：用戶只需掃描，不用手動輸入長串 Secret
2. **準確性**：避免手動輸入錯誤
3. **安全性**：
   - 只在用戶自己的螢幕上顯示
   - 只顯示一次，不會被記錄
   - QR Code 內容包含 Secret，但只在本地設備間傳輸

QR Code 內容示例：
```
otpauth://totp/ft_transcendence(123)?secret=MFRGG...&issuer=ft_transcendence
```

#### Q16: "如果用戶丟失手機怎麼辦？"

**回答要點：**
1. **目前實作**：用戶可以在設置中禁用 2FA（需要先登入）
2. **更好的做法**：
   - 生成備用碼（Recovery Codes）
   - 激活 2FA 時顯示 10 組備用碼
   - 用戶應該列印或安全保存
   - 每個備用碼只能用一次

示例實作：
```typescript
// 生成 10 組備用碼
const recoveryCodes = [];
for (let i = 0; i < 10; i++) {
  recoveryCodes.push(crypto.randomBytes(4).toString('hex'));
}
// ["a3b4c5d6", "e7f8g9h0", ...]
```

#### Q17: "為什麼 2FA 設置時用臨時 Redis 存儲？"

**回答要點：**
1. **安全性**：
   - 只有驗證成功才永久存入 DB
   - 如果用戶取消或失敗，Secret 不會洩漏
2. **時效性**：
   - 10 分鐘自動過期
   - 防止未完成的設置流程殘留
3. **防止濫用**：
   - 用戶必須在 10 分鐘內完成設置
   - 驗證成功後，Redis 中的臨時資料立即刪除

流程：
```
1. 用戶請求設置 → Secret 存 Redis (10min)
2. 用戶掃描 QR Code
3. 用戶輸入驗證碼
4. 驗證成功 → Secret 存 DB，刪除 Redis
5. 驗證失敗或超時 → Redis 自動過期，沒有殘留
```

#### Q18: "為什麼允許 ±30 秒的時間窗口 (window=1)？"

**回答要點：**
1. **時鐘偏差**：Server 和手機的時鐘可能不完全同步
2. **用戶體驗**：用戶可能在驗證碼即將過期時輸入
3. **安全平衡**：
   - window=0：只接受當前時間步長（太嚴格）
   - window=1：接受前後 ±30 秒（推薦）
   - window=2：接受前後 ±60 秒（太寬鬆）

```
時間軸：
... [T-2] [T-1] [T] [T+1] [T+2] ...
          ✓     ✓   ✓      (window=1)
```

---

**第四部分完成！下一部分將涵蓋：**
- Route Protection (路由保護)
- Middleware 機制
- 權限控制
- API 端點安全

繼續嗎？

---

## 7. Route Protection（路由保護）

### 7.1 什麼是 Middleware？

**Middleware（中間件）** 是一個在請求到達最終處理函數**之前**執行的函數。

#### 視覺化流程

```
Client Request
    │
    ▼
┌────────────────┐
│   Middleware   │  ← 在這裡檢查權限！
│  (驗證 JWT)    │
└────────┬───────┘
         │
    ┌────┴────┐
    │         │
  ✅ 通過    ❌ 拒絕
    │         │
    ▼         ▼
┌─────────┐ ┌──────────┐
│ Route   │ │ 401      │
│ Handler │ │ Error    │
└─────────┘ └──────────┘
```

**沒有 Middleware 的情況：**
```typescript
// ❌ 每個 route 都要重複驗證邏輯
app.get('/profile', async (req, res) => {
  // 驗證 token
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).send({error: 'No token'});
  
  const valid = await verifyToken(token);
  if (!valid) return res.status(401).send({error: 'Invalid token'});
  
  // 實際業務邏輯
  const profile = await getProfile(userId);
  res.send(profile);
});

app.get('/settings', async (req, res) => {
  // 又要重複一次驗證邏輯... 😫
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).send({error: 'No token'});
  
  const valid = await verifyToken(token);
  if (!valid) return res.status(401).send({error: 'Invalid token'});
  
  const settings = await getSettings(userId);
  res.send(settings);
});
```

**有 Middleware 的情況：**
```typescript
// ✅ 驗證邏輯集中管理
const authMiddleware = async (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).send({error: 'No token'});
  
  const valid = await verifyToken(token);
  if (!valid) return res.status(401).send({error: 'Invalid token'});
  
  req.user = { userId: valid.userId };  // 儲存用戶資訊
};

// 使用 middleware 保護 routes
app.get('/profile', { preHandler: authMiddleware }, async (req, res) => {
  // 已經驗證過了，直接使用！
  const profile = await getProfile(req.user.userId);
  res.send(profile);
});

app.get('/settings', { preHandler: authMiddleware }, async (req, res) => {
  // 已經驗證過了，直接使用！
  const settings = await getSettings(req.user.userId);
  res.send(settings);
});
```

**好處：**
1. **DRY (Don't Repeat Yourself)**：驗證邏輯只寫一次
2. **集中管理**：修改驗證邏輯只需改一個地方
3. **清晰分離**：業務邏輯和驗證邏輯分開
4. **易於測試**：可以單獨測試 middleware

### 7.2 專案中的三種 Middleware

你的專案有**三種不同的 JWT 類型**，對應三種不同的 middleware：

```
┌──────────────────────────────────────────────────────────┐
│                    JWT Types                             │
└──────────────────────────────────────────────────────────┘

1. USER_SESSION
   ├─ 用途：一般用戶操作
   ├─ Middleware: userSessionMiddleware
   ├─ 特性：自動刷新 Access Token
   └─ 範例路由：/profile, /settings, /2fa/setup

2. GAME_SESSION
   ├─ 用途：遊戲中的操作
   ├─ Middleware: gameSessionMiddleware
   ├─ 特性：簡單驗證，無刷新
   └─ 範例路由：/game/move, /game/score

3. INTERNAL_ACCESS
   ├─ 用途：微服務間通訊
   ├─ Middleware: internalAuthMiddleware
   ├─ 特性：驗證服務身份
   └─ 範例路由：/internal/users/:id, /internal/stats
```

### 7.3 userSessionMiddleware 詳解

這是最複雜的 middleware，因為它有**自動刷新**功能。

位置：`srcs/backend/auth/src/middleware/user-auth.ts`

```typescript
export const userSessionMiddleware = async (
  request: FastifyRequest, 
  reply: FastifyReply
) => {
  // 1. 獲取兩個 token
  const accessToken = request.cookies?.accessToken;
  const refreshToken = request.cookies?.refreshToken;

  // 2. 檢查是否有 access token
  if (!accessToken) {
    return reply.code(401).send({ 
      error: 'No user session token provided.' 
    });
  }

  // 3. 驗證 token（可能會自動刷新）
  const result = await authService.validate_and_refresh_Tokens(
    fastify, 
    accessToken, 
    refreshToken || ''
  );

  if (!result.success) {
    // 驗證失敗，清除 cookies
    reply.clearCookie('accessToken', { /* ... */ });
    reply.clearCookie('refreshToken', { /* ... */ });
    return reply.code(401).send({ 
      error: 'Invalid or expired user session.' 
    });
  }

  // 4. 如果 access token 被刷新了，更新 cookie
  if (result.newAccessToken) {
    authUtils.ft_setCookie(
      reply, 
      result.newAccessToken, 
      CONFIG.JWT.USER.ACCESS_TOKEN_EXPIRY
    );
  }

  // 5. 將用戶資訊附加到 request 上
  request.user = { 
    userId: result.userId, 
    jwtType: 'USER_SESSION' 
  };
  
  // 6. 允許請求繼續
  // (不 return，讓 Fastify 繼續執行下一個 handler)
};
```

#### validate_and_refresh_Tokens 流程

```
                validate_and_refresh_Tokens
                           │
                           ▼
              ┌────────────────────────┐
              │ 驗證 Access Token      │
              └────────┬───────────────┘
                       │
                  ┌────┴────┐
                  │         │
              有效 ✓      過期 ✗
                  │         │
                  │         ▼
                  │   ┌──────────────────┐
                  │   │ 檢查 Refresh     │
                  │   │ Token 是否存在    │
                  │   └────────┬─────────┘
                  │            │
                  │       ┌────┴────┐
                  │       │         │
                  │      有 ✓      無 ✗
                  │       │         │
                  │       ▼         ▼
                  │   ┌─────────┐ ┌────────┐
                  │   │ 驗證    │ │ 失敗    │
                  │   │ Refresh │ │ 401    │
                  │   └────┬────┘ └────────┘
                  │        │
                  │   ┌────┴────┐
                  │   │         │
                  │  有效 ✓    過期 ✗
                  │   │         │
                  │   ▼         ▼
                  │ ┌─────────┐ ┌────────┐
                  │ │ 生成新   │ │ 失敗   │
                  │ │ Access  │ │ 401    │
                  │ │ Token   │ └────────┘
                  │ └────┬────┘
                  │      │
                  └──────┴──────┐
                                │
                                ▼
                    ┌────────────────────┐
                    │ 返回成功 + userId   │
                    │ (可能包含新 token)  │
                    └────────────────────┘
```

#### 使用範例

```typescript
// srcs/backend/auth/src/routes/twofa.routes.ts

// 設置 2FA（需要已登入）
fastify.post('/setup', {
  preHandler: userSessionMiddleware  // ← 在這裡保護！
}, async (request, reply) => {
  // 執行到這裡時，已經確定：
  // 1. 用戶有有效的 JWT
  // 2. request.user.userId 已經設定
  
  const userId = request.user.userId;  // 安全取得！
  
  // 業務邏輯...
  const secret = speakeasy.generateSecret({ /* ... */ });
  // ...
});

// 禁用 2FA（也需要已登入）
fastify.post('/disable', {
  preHandler: userSessionMiddleware  // ← 同樣的保護！
}, async (request, reply) => {
  const userId = request.user.userId;
  // ...
});
```

### 7.4 internalAuthMiddleware（微服務間）

這個 middleware 用於保護**只有內部服務**才能訪問的端點。

位置：`srcs/backend/users/src/middleware/internalAuth.ts`

```typescript
export async function internalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // 1. 檢查 Authorization header
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid authorization header');
      return reply.status(401).send({ 
        error: 'Missing or invalid authorization header' 
      });
    }

    // 2. 提取 token（去掉 "Bearer " 前綴）
    const token = authHeader.substring(7);
    
    // 3. 使用 JWKS 驗證 token
    console.log(`🔍 Verifying internal JWT for ${request.method} ${request.url}`);
    await verifyInternalJWT(token);
    console.log('✅ Internal JWT verified successfully');
        
  } catch (error) {
    console.log('❌ Internal JWT verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      url: request.url,
      method: request.method
    });
    return reply.status(401).send({ 
      error: 'Invalid internal JWT',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

#### 使用範例

```typescript
// srcs/backend/users/src/routes/users.ts

// 內部端點：只有其他微服務可以訪問
fastify.get('/internal/user/:id', {
  preHandler: internalAuthMiddleware  // ← 只允許微服務！
}, async (request, reply) => {
  const { id } = request.params;
  const user = await getUserById(id);
  return reply.send(user);
});

// 用戶端點：需要用戶 JWT
fastify.get('/me', {
  preHandler: userAuthMiddleware  // ← 只允許登入用戶！
}, async (request, reply) => {
  const userId = request.authUser.sub;
  const user = await getUserById(userId);
  return reply.send(user);
});
```

### 7.5 userAuthSwitcher（可選驗證）

有些端點**既可以給登入用戶，也可以給訪客**使用。

```typescript
export async function userAuthSwitcher(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    let token: string | undefined;

    // 嘗試獲取 token
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (!token && request.cookies?.accessToken) {
      token = request.cookies.accessToken;
    }

    // 如果沒有 token，設為 guest（不報錯）
    if (!token) {
      request.log.info({
        user_id: null,
        path: request.url,
        method: request.method
      }, 'Guest access');
      return;  // ← 允許繼續，但 authUser 為 undefined
    }

    // 如果有 token，嘗試驗證
    const payload = await verifyUserSessionJWT(token);
    
    request.authUser = payload as UserSessionPayload;
    
    request.log.info({
      user_id: payload.sub,
      path: request.url,
      method: request.method
    }, 'User access');

  } catch (error) {
    // 驗證失敗也允許繼續（作為 guest）
    request.log.info({
      user_id: null,
      path: request.url,
      method: request.method
    }, 'User access (invalid token, treated as guest)');
  }
}
```

#### 使用範例

```typescript
// 公開遊戲列表，登入用戶可以看到額外資訊
fastify.get('/games', {
  preHandler: userAuthSwitcher  // ← 可選驗證
}, async (request, reply) => {
  const games = await getAllGames();
  
  // 如果用戶已登入
  if (request.authUser) {
    const userId = request.authUser.sub;
    
    // 添加用戶相關資訊（如：是否已加入該遊戲）
    const gamesWithUserInfo = await addUserInfo(games, userId);
    return reply.send(gamesWithUserInfo);
  }
  
  // 訪客只看基本資訊
  return reply.send(games);
});
```

### 7.6 路由保護策略總覽

```
┌──────────────────────────────────────────────────────────────────┐
│                    Route Protection Matrix                       │
└──────────────────────────────────────────────────────────────────┘

端點類型               │  Middleware             │  允許訪問者
──────────────────────┼─────────────────────────┼──────────────────
公開端點               │  無                     │  所有人
  /api/auth/login     │  -                      │  任何人
  /api/auth/register  │  -                      │  任何人
──────────────────────┼─────────────────────────┼──────────────────
用戶端點               │  userSessionMiddleware  │  登入用戶
  /api/auth/2fa/setup │  ✓                      │  已登入
  /api/users/me       │  ✓                      │  已登入
  /api/users/settings │  ✓                      │  已登入
──────────────────────┼─────────────────────────┼──────────────────
遊戲端點               │  gameSessionMiddleware  │  遊戲中的用戶
  /api/game/move      │  ✓                      │  遊戲中
  /api/game/score     │  ✓                      │  遊戲中
──────────────────────┼─────────────────────────┼──────────────────
內部端點               │  internalAuthMiddleware │  微服務
  /internal/users/:id │  ✓                      │  只有微服務
  /internal/stats     │  ✓                      │  只有微服務
──────────────────────┼─────────────────────────┼──────────────────
可選驗證端點           │  userAuthSwitcher       │  所有人（但登入
  /api/games (list)   │  ✓                      │  用戶看更多資訊）
──────────────────────┴─────────────────────────┴──────────────────
```

### 7.7 TypeScript 類型擴展

為了讓 `request.user` 和 `request.authUser` 有正確的型別提示：

```typescript
// 擴展 Fastify 的 Request 介面
declare module 'fastify' {
  interface FastifyRequest {
    authUser?: UserSessionPayload;  // 用戶 JWT 的 payload
    user?: {
      userId: number;
      jwtType?: string;
      gameId?: string;
      serviceId?: string;
      permissions?: string[];
    };
  }
}
```

**效果：**
```typescript
// ✅ TypeScript 知道這些屬性存在
fastify.post('/profile', {
  preHandler: userSessionMiddleware
}, async (request, reply) => {
  const userId = request.user.userId;  // ← 有自動補全！
  // ...
});
```

### 7.8 錯誤處理流程

```
Request
  │
  ▼
┌──────────────────┐
│  Middleware      │
└────────┬─────────┘
         │
    ┌────┴────────────────┐
    │                     │
 Token 存在          Token 不存在
    │                     │
    ▼                     ▼
┌─────────────┐     ┌──────────────┐
│ 驗證 Token  │     │ 401 Error    │
└──────┬──────┘     │ "No token"   │
       │            └──────────────┘
  ┌────┴─────┐
  │          │
有效 ✓     過期 ✗
  │          │
  │          ▼
  │     ┌─────────────────┐
  │     │ 嘗試刷新         │
  │     │ (如果有 refresh) │
  │     └────────┬────────┘
  │              │
  │         ┌────┴────┐
  │         │         │
  │       成功 ✓    失敗 ✗
  │         │         │
  │         │         ▼
  │         │    ┌──────────────┐
  │         │    │ 401 Error    │
  │         │    │ "Expired"    │
  │         │    │ + 清除 cookies│
  │         │    └──────────────┘
  │         │
  └─────────┘
       │
       ▼
┌──────────────────┐
│ 設定 request.user│
│ 允許繼續          │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  Route Handler   │
└──────────────────┘
```

### 7.9 安全性最佳實踐

#### 7.9.1 Always Validate

```typescript
// ❌ 錯誤：信任 middleware 一定成功
fastify.post('/profile', {
  preHandler: userSessionMiddleware
}, async (request, reply) => {
  const userId = request.user.userId;  // 可能是 undefined！
  // ...
});

// ✅ 正確：double check
fastify.post('/profile', {
  preHandler: userSessionMiddleware
}, async (request, reply) => {
  if (!request.user?.userId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  
  const userId = request.user.userId;  // 安全！
  // ...
});
```

#### 7.9.2 不要在客戶端存儲敏感資訊

```typescript
// ❌ 錯誤：把敏感資訊放在 JWT payload
const token = jwt.sign({
  userId: 123,
  email: 'user@example.com',
  password: 'hashed...',  // ← 絕對不要！
  creditCard: '1234...'   // ← 絕對不要！
}, SECRET);

// ✅ 正確：只存必要的識別資訊
const token = jwt.sign({
  userId: 123,
  // 其他資訊從資料庫查詢
}, SECRET);
```

#### 7.9.3 Middleware 順序很重要

```typescript
// ❌ 錯誤順序：先執行業務邏輯，再驗證
fastify.post('/delete-account', {
  preHandler: [
    deleteAccountHandler,      // ← 太晚了！
    userSessionMiddleware
  ]
}, /* ... */);

// ✅ 正確順序：先驗證，再執行業務邏輯
fastify.post('/delete-account', {
  preHandler: userSessionMiddleware  // ← 先驗證！
}, async (request, reply) => {
  // 然後執行業務邏輯
  await deleteAccount(request.user.userId);
});
```

#### 7.9.4 記錄所有驗證失敗

```typescript
export const userSessionMiddleware = async (request, reply) => {
  // ...
  
  if (!result.success) {
    // 記錄失敗原因（用於安全審計）
    request.log.warn({
      ip: request.ip,
      path: request.url,
      reason: 'Invalid token',
      timestamp: new Date()
    }, 'Authentication failed');
    
    return reply.code(401).send({ error: 'Unauthorized' });
  }
};
```

---

## 📝 Evaluation Defense - Part 5

### 評審可能問的問題：

#### Q19: "什麼是 Middleware？為什麼要用它？"

**回答要點：**
1. **定義**：在請求到達最終處理函數**之前**執行的函數
2. **目的**：
   - 集中驗證邏輯（DRY 原則）
   - 清晰分離關注點（驗證 vs 業務邏輯）
   - 易於維護和測試
3. **沒有 middleware**：每個 route 都要重複驗證代碼
4. **有 middleware**：驗證邏輯只寫一次，多處使用

**可以畫這個圖：**
```
Request → Middleware (驗證) → Route Handler (業務邏輯)
            ↓ 失敗
          401 Error
```

#### Q20: "你的專案有幾種 Middleware？分別用在哪裡？"

**回答要點：**
1. **userSessionMiddleware**：
   - 用於一般用戶操作（/profile, /settings, /2fa/setup）
   - 特點：自動刷新 Access Token
   
2. **internalAuthMiddleware**：
   - 用於微服務間通訊（/internal/users/:id）
   - 特點：使用 JWKS 驗證 INTERNAL_ACCESS token
   
3. **gameSessionMiddleware**：
   - 用於遊戲中的操作（/game/move）
   - 特點：簡單驗證，無自動刷新
   
4. **userAuthSwitcher**（可選）：
   - 用於可選驗證的端點（/games 列表）
   - 特點：登入用戶看更多資訊，訪客看基本資訊

#### Q21: "userSessionMiddleware 如何實現自動刷新 Token？"

**回答要點：**
1. **檢查兩個 token**：Access Token + Refresh Token
2. **驗證 Access Token**：
   - 有效 → 直接通過
   - 過期 → 檢查 Refresh Token
3. **如果 Refresh Token 有效**：
   - 生成新的 Access Token
   - 更新 Cookie
   - 允許請求繼續
4. **如果 Refresh Token 也過期**：
   - 清除 Cookies
   - 返回 401 錯誤

**流程圖：**
```
Access Token 過期? 
  ↓ Yes
Refresh Token 有效?
  ↓ Yes
生成新 Access Token
  ↓
更新 Cookie
  ↓
允許請求繼續
```

#### Q22: "內部端點（Internal）和用戶端點的保護有什麼不同？"

**回答要點：**
1. **用戶端點**：
   - 驗證 USER_SESSION token
   - Token 來自 Cookie
   - 自動刷新功能
   - 對象：瀏覽器中的用戶
   
2. **內部端點**：
   - 驗證 INTERNAL_ACCESS token
   - Token 來自 Authorization header（`Bearer xxx`）
   - 無刷新功能（服務間通訊不需要）
   - 對象：其他微服務
   - 使用 JWKS 驗證（公鑰從 Auth Service 獲取）

**安全考量：**
- 內部端點**絕對不能**暴露給外部用戶
- 應該在 API Gateway 層面就阻擋外部訪問
- 或者只在內部網路中監聽

#### Q23: "如果 Middleware 驗證失敗，會發生什麼？"

**回答要點：**
1. **立即返回 401 錯誤**：
   ```typescript
   return reply.code(401).send({ error: 'Unauthorized' });
   ```
   
2. **請求不會到達 Route Handler**：
   - Middleware 中使用 `return` 會中止請求
   - Route Handler 不會被執行
   
3. **清除無效的 Cookies**：
   ```typescript
   reply.clearCookie('accessToken');
   reply.clearCookie('refreshToken');
   ```
   
4. **記錄失敗日誌**（用於安全審計）：
   ```typescript
   request.log.warn({
     ip: request.ip,
     path: request.url,
     reason: 'Invalid token'
   }, 'Authentication failed');
   ```

#### Q24: "為什麼有些端點使用 userAuthSwitcher 而不是 userSessionMiddleware？"

**回答要點：**
1. **目的不同**：
   - `userSessionMiddleware`：**必須**登入才能訪問
   - `userAuthSwitcher`：**可選**登入，訪客也能訪問
   
2. **使用場景**：
   - 遊戲列表：訪客可以看，登入用戶看更多資訊
   - 公開資料：訪客可以看基本版，登入用戶看完整版
   
3. **行為差異**：
   - `userSessionMiddleware`：無 token → 401 錯誤
   - `userAuthSwitcher`：無 token → 繼續執行（作為訪客）
   
4. **實作差異**：
   ```typescript
   // userAuthSwitcher
   if (!token) {
     return;  // ← 允許繼續，但 authUser 為 undefined
   }
   
   // userSessionMiddleware
   if (!token) {
     return reply.code(401).send(...);  // ← 拒絕請求
   }
   ```

#### Q25: "Fastify 的 preHandler 是什麼？"

**回答要點：**
1. **定義**：Fastify 的 Hook 機制之一，在 route handler 之前執行
2. **語法**：
   ```typescript
   fastify.get('/path', {
     preHandler: middlewareFunction  // 單個 middleware
   }, handlerFunction);
   
   fastify.get('/path', {
     preHandler: [middleware1, middleware2]  // 多個 middleware
   }, handlerFunction);
   ```
   
3. **執行順序**：
   ```
   Request → preHandler → Handler → Response
   ```
   
4. **與 Express middleware 的區別**：
   - Express: `app.get('/path', middleware, handler)`
   - Fastify: `fastify.get('/path', { preHandler: middleware }, handler)`
   - Fastify 的方式更明確、更有結構

---

**第五部分完成！下一部分將涵蓋：**
- Multi-language (i18n) 系統
- 語言切換機制
- 前端 i18n 實作

繼續嗎？

---

## 8. Multi-language System (i18n)

### 8.1 什麼是 i18n？

**i18n** 是 "internationalization" 的縮寫（i 和 n 之間有 18 個字母）。

目的：讓應用程式支援**多種語言**，不需要修改代碼就能切換語言。

#### 你的專案支援的語言

```
🇺🇸 English (en)
🇨🇳 中文 (zh)
🇫🇷 Français (fr)
🇷🇺 Русский (ru)
```

### 8.2 i18n 系統架構

```
┌──────────────────────────────────────────────────────────────┐
│                    i18n Architecture                         │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 1. Translation Files (translations.ts)                      │
│    ┌──────────────────────────────────────────────────────┐ │
│    │ {                                                    │ │
│    │   en: { "login": "Log In", "signup": "Sign Up" }     │ │
│    │   zh: { "login": "登入", "signup": "註冊" }           │ │
│    │   fr: { "login": "Connexion", "signup": "S'inscrire"}│ │
│    │   ru: { "login": "Войти", "signup": "Регистрация" }  │ │
│    │ }                                                    │ │
│    └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. i18n Core (i18n.ts)                                      │
│    - 管理當前語言                                            │
│    - t() 函數：翻譯 key → 對應語言的文字                      │
│    - setLanguage()：切換語言                                 │
│    - 自動偵測瀏覽器語言                                       │
│    - localStorage 儲存用戶選擇                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. HTML Attributes                                          │
│    <button data-i18n="login">Log In</button>                │
│    <input data-i18n-placeholder="enterUsername">            │
│    <div data-i18n-title="tooltip">...</div>                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Language Switcher (languageSwitcher.ts)                  │
│    🇺🇸 English ▼                                             │
│    🇨🇳 中文                                                  │
│    🇫🇷 Français                                              │
│    🇷🇺 Русский                                               │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Translation Files 結構

位置：`srcs/frontend/src/scripts/i18n/translations.ts`

```typescript
export const translations = {
  en: {
    // Authentication
    "login": "Log In",
    "signup": "Sign Up",
    "username": "Username:",
    "password": "Password:",
    "loginWithGoogle": "Log In with Google",
    
    // 2FA
    "2faConfiguration": "2FA Configuration",
    "scanQRCode": "Scan this QR code with your authenticator app:",
    "enterSixDigitCode": "Enter the 6-digit code:",
    "activate2FA": "Activate 2FA",
    
    // Profile
    "myProfile": "My Profile",
    "settings": "Settings",
    "currentWinStreak": "Current Winstreak",
    
    // Game
    "playPong": "Play Pong",
    "onePlayer": "One player",
    "twoPlayers": "Two players",
    "points": "Points",
    
    // Tournament
    "tournament": "Tournament",
    "startTournament": "Start Tournament",
    "champion": "Champion",
    
    // Common
    "backToHome": "Back to Home",
    "loading": "Loading...",
    "error": "Error",
    "cancel": "Cancel",
    "verify": "Verify"
  },
  
  zh: {
    // Authentication
    "login": "登入",
    "signup": "註冊",
    "username": "用戶名：",
    "password": "密碼：",
    "loginWithGoogle": "使用 Google 登入",
    
    // 2FA
    "2faConfiguration": "雙因素認證設置",
    "scanQRCode": "使用驗證器應用掃描此 QR Code：",
    "enterSixDigitCode": "輸入 6 位數驗證碼：",
    "activate2FA": "啟用 2FA",
    
    // Profile
    "myProfile": "我的資料",
    "settings": "設定",
    "currentWinStreak": "當前連勝",
    
    // Game
    "playPong": "開始遊戲",
    "onePlayer": "單人模式",
    "twoPlayers": "雙人模式",
    "points": "得分",
    
    // Tournament
    "tournament": "錦標賽",
    "startTournament": "開始錦標賽",
    "champion": "冠軍",
    
    // Common
    "backToHome": "返回首頁",
    "loading": "載入中...",
    "error": "錯誤",
    "cancel": "取消",
    "verify": "驗證"
  },
  
  fr: { /* 法語翻譯 */ },
  ru: { /* 俄語翻譯 */ }
};

// TypeScript 類型定義
export type Language = 'en' | 'zh' | 'fr' | 'ru';
export type TranslationKey = keyof typeof translations.en;
```

**關鍵設計：**
1. **單一 source of truth**：所有翻譯集中管理
2. **TypeScript 類型安全**：`TranslationKey` 確保不會用錯的 key
3. **易於維護**：新增語言只需添加一個對象
4. **結構化**：用註釋分組（Authentication, 2FA, Profile 等）

### 8.4 i18n Core 實作

位置：`srcs/frontend/src/scripts/i18n/i18n.ts`

```typescript
class I18n {
  private currentLanguage: Language = 'en';
  private translations = translations;

  constructor() {
    // 1. 嘗試從 localStorage 讀取用戶之前的選擇
    try {
      const savedLanguage = localStorage.getItem('language') as Language;
      if (savedLanguage && savedLanguage in this.translations) {
        this.currentLanguage = savedLanguage;
      } else {
        // 2. 如果沒有，偵測瀏覽器語言
        const browserLang = navigator.language.split('-')[0] as Language;
        // navigator.language 可能是 "zh-TW", "en-US" 等
        // 取 "-" 前面的部分
        
        if (browserLang in this.translations) {
          this.currentLanguage = browserLang;
        }
      }
    } catch (error) {
      // localStorage 可能被禁用（私密模式等）
      console.warn('Failed to access localStorage, using default language');
    }
  }

  // 翻譯函數：將 key 轉換為當前語言的文字
  t(key: TranslationKey): string {
    return this.translations[this.currentLanguage][key] || key;
    // 如果找不到翻譯，返回 key 本身（避免顯示 undefined）
  }

  // 切換語言
  setLanguage(language: Language): void {
    if (language in this.translations) {
      this.currentLanguage = language;
      
      // 保存到 localStorage
      try {
        localStorage.setItem('language', language);
      } catch (error) {
        console.warn('Failed to save language to localStorage');
      }
      
      // 更新頁面上的所有翻譯
      this.updatePageTranslations();
      
      // 觸發自定義事件（讓其他組件知道語言已變更）
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { language } 
      }));
    }
  }

  // 獲取當前語言
  getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  // 獲取所有可用語言
  getAvailableLanguages(): { code: Language; name: string }[] {
    return [
      { code: 'en', name: this.translations.en.english },
      { code: 'zh', name: this.translations.zh.chinese },
      { code: 'fr', name: this.translations.fr.french },
      { code: 'ru', name: this.translations.ru.russian },
    ];
  }

  // 更新頁面上的所有翻譯
  private updatePageTranslations(): void {
    // 1. 更新所有 data-i18n 元素（textContent）
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n') as TranslationKey;
      if (key && element.textContent !== null) {
        element.textContent = this.t(key);
      }
    });

    // 2. 更新所有 data-i18n-placeholder（input placeholder）
    const inputs = document.querySelectorAll('[data-i18n-placeholder]');
    inputs.forEach(input => {
      const key = input.getAttribute('data-i18n-placeholder') as TranslationKey;
      if (key && input instanceof HTMLInputElement) {
        input.placeholder = this.t(key);
      }
    });

    // 3. 更新所有 data-i18n-title（tooltip）
    const titledElements = document.querySelectorAll('[data-i18n-title]');
    titledElements.forEach(element => {
      const key = element.getAttribute('data-i18n-title') as TranslationKey;
      if (key) {
        element.setAttribute('title', this.t(key));
      }
    });

    // 4. 更新所有 data-i18n-prefix（例如："Player 1", "Player 2"）
    const prefixElements = document.querySelectorAll('[data-i18n-prefix]');
    prefixElements.forEach(element => {
      const prefix = element.getAttribute('data-i18n-prefix') as TranslationKey;
      if (prefix && element instanceof HTMLLabelElement) {
        const htmlFor = element.getAttribute('for');
        if (htmlFor) {
          const match = htmlFor.match(/\d+$/);  // 提取數字
          if (match) {
            element.textContent = `${this.t(prefix)} ${match[0]}`;
          }
        }
      }
    });
  }

  // 初始化頁面翻譯（頁面載入後呼叫）
  initializePage(): void {
    this.updatePageTranslations();
  }
}

// 創建全域 i18n 實例
export const i18n = new I18n();

// 方便使用的全域函數
export const t = (key: TranslationKey): string => i18n.t(key);
export const setLanguage = (language: Language): void => i18n.setLanguage(language);
export const getCurrentLanguage = (): Language => i18n.getCurrentLanguage();
```

### 8.5 HTML 中的使用方式

#### 方式 1: data-i18n（文字內容）

```html
<!-- 按鈕文字 -->
<button data-i18n="login">Log In</button>

<!-- 標題 -->
<h2 data-i18n="2faConfiguration">2FA Configuration</h2>

<!-- 段落 -->
<p data-i18n="scanQRCode">Scan this QR code...</p>
```

**運作原理：**
```javascript
// i18n 系統會找到所有 [data-i18n] 元素
const elements = document.querySelectorAll('[data-i18n]');

elements.forEach(element => {
  const key = element.getAttribute('data-i18n');  // "login"
  element.textContent = i18n.t(key);  // "登入" (如果語言是中文)
});
```

#### 方式 2: data-i18n-placeholder（輸入框提示）

```html
<input 
  type="text" 
  id="username" 
  data-i18n-placeholder="enterUsername" 
  placeholder="Enter username"
>
```

**運作原理：**
```javascript
const inputs = document.querySelectorAll('[data-i18n-placeholder]');

inputs.forEach(input => {
  const key = input.getAttribute('data-i18n-placeholder');
  input.placeholder = i18n.t(key);  // "輸入用戶名"
});
```

#### 方式 3: data-i18n-title（Tooltip）

```html
<img 
  id="qrcode-img" 
  src="" 
  data-i18n-title="qrCode" 
  alt="QR Code"
>
```

**運作原理：**
```javascript
const titledElements = document.querySelectorAll('[data-i18n-title]');

titledElements.forEach(element => {
  const key = element.getAttribute('data-i18n-title');
  element.setAttribute('title', i18n.t(key));  // "二維碼"
});
```

#### 方式 4: data-i18n-prefix（動態編號）

```html
<!-- 用於 "Player 1", "Player 2" 等 -->
<label for="player-1" data-i18n-prefix="player">Player</label>
<input id="player-1" type="text">

<label for="player-2" data-i18n-prefix="player">Player</label>
<input id="player-2" type="text">
```

**運作原理：**
```javascript
const prefixElements = document.querySelectorAll('[data-i18n-prefix]');

prefixElements.forEach(element => {
  const prefix = element.getAttribute('data-i18n-prefix');  // "player"
  const htmlFor = element.getAttribute('for');  // "player-1"
  const number = htmlFor.match(/\d+$/)[0];  // "1"
  
  element.textContent = `${i18n.t(prefix)} ${number}`;  // "玩家 1"
});
```

### 8.6 Language Switcher（語言切換器）

位置：`srcs/frontend/src/scripts/i18n/languageSwitcher.ts`

```typescript
// 建立語言切換器 UI
export function createLanguageSwitcher(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'language-switcher';
  
  const select = document.createElement('select');
  select.id = 'language-select';
  select.className = 'language-select';
  
  // 創建選項
  getAvailableLanguages().forEach(lang => {
    const option = document.createElement('option');
    option.value = lang.code;  // "en", "zh", etc.
    
    // 添加國旗 emoji
    const flags: { [key: string]: string } = {
      'en': '🇺🇸',
      'zh': '🇨🇳',
      'fr': '🇫🇷',
      'ru': '🇷🇺'
    };
    const flag = flags[lang.code] || '';
    option.text = flag ? `${flag} ${lang.name}` : lang.name;
    // 結果：🇺🇸 English, 🇨🇳 中文, etc.
    
    // 設定當前選中的語言
    option.selected = i18n.getCurrentLanguage() === lang.code;
    select.appendChild(option);
  });
  
  // 添加事件監聽器
  select.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    setLanguage(target.value as Language);
    // 切換語言後，i18n 會自動更新頁面上的所有文字
  });
  
  container.appendChild(select);
  return container;
}

// 初始化語言切換器（添加到頁面）
export function initLanguages(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addLanguageSwitcher);
  } else {
    addLanguageSwitcher();
  }
}

function addLanguageSwitcher(): void {
  setTimeout(() => {
    // 找到 languagesSwitcher 容器
    const languagesSwitcher = document.getElementById('languagesSwitcher');
    
    if (languagesSwitcher) {
      const existingSwitcher = languagesSwitcher.querySelector('.language-switcher');
      
      // 避免重複添加
      if (!existingSwitcher) {
        const switcher = createLanguageSwitcher();
        languagesSwitcher.appendChild(switcher);
      }
    }
  }, 100);
}
```

**HTML 中的使用：**
```html
<!-- login.html -->
<div class="top-left-btns">
  <button class="back-to-home-btn" data-route="/" data-i18n="backToHome">
    Back to Home
  </button>
  <div id="languagesSwitcher"></div>  <!-- ← 語言切換器會被插入這裡 -->
</div>
```

### 8.7 完整的語言切換流程

```
┌────────────────────────────────────────────────────────────────┐
│                  Language Switch Flow                          │
└────────────────────────────────────────────────────────────────┘

User 點擊語言選單
    │
    ▼
選擇 "🇨🇳 中文"
    │
    ▼
┌────────────────────────────┐
│ select.addEventListener()  │
│ → setLanguage('zh')        │
└──────────┬─────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ i18n.setLanguage('zh')             │
│ 1. currentLanguage = 'zh'          │
│ 2. localStorage.setItem(...)       │
│ 3. updatePageTranslations()        │
│ 4. dispatchEvent('languageChanged')│
└──────────┬─────────────────────────┘
           │
           ▼
┌────────────────────────────────────────┐
│ updatePageTranslations()               │
│ 1. 找到所有 [data-i18n]                 │
│    "Log In" → "登入"                    │
│    "Sign Up" → "註冊"                   │
│ 2. 找到所有 [data-i18n-placeholder]     │
│    "Enter username" → "輸入用戶名"      │
│ 3. 找到所有 [data-i18n-title]           │
│    "QR Code" → "二維碼"                 │
└─────────┬──────────────────────────────┘
          │
          ▼
┌────────────────────────────┐
│ 頁面上的所有文字即時更新     │
│ ✓ 按鈕文字                  │
│ ✓ 輸入框提示                │
│ ✓ Tooltip                  │
│ ✓ 動態生成的內容            │
└────────────────────────────┘
          │
          ▼
┌────────────────────────────┐
│ languageChanged 事件觸發    │
│ （其他組件可以監聽此事件）   │
└────────────────────────────┘
```

### 8.8 初始化流程

```typescript
// 在每個頁面載入時
import { i18n } from './scripts/i18n/i18n.js';
import { initLanguages } from './scripts/i18n/languageSwitcher.js';

// 1. 初始化語言切換器（添加到 DOM）
initLanguages();

// 2. 初始化頁面翻譯（更新所有 data-i18n 元素）
i18n.initializePage();
```

**載入順序：**
```
1. i18n 構造函數執行
   ↓
   - 檢查 localStorage 中的語言設定
   - 或偵測瀏覽器語言
   - 設定 currentLanguage

2. initLanguages() 執行
   ↓
   - 創建語言切換器 UI
   - 添加到 #languagesSwitcher 容器

3. i18n.initializePage() 執行
   ↓
   - updatePageTranslations()
   - 根據當前語言更新所有文字
```

### 8.9 TypeScript 類型安全

```typescript
// translations.ts

// 1. 定義支援的語言
export type Language = 'en' | 'zh' | 'fr' | 'ru';

// 2. 從 translations.en 推斷所有可能的 key
export type TranslationKey = keyof typeof translations.en;

// 結果：TranslationKey = "login" | "signup" | "username" | ...
```

**好處：**
```typescript
// ✅ 正確：使用有效的 key
i18n.t('login');  // OK

// ❌ 錯誤：TypeScript 會報錯
i18n.t('invalidKey');  // Error: Argument of type '"invalidKey"' is not assignable to parameter of type 'TranslationKey'
```

```html
<!-- ✅ 正確 -->
<button data-i18n="login">Log In</button>

<!-- ❌ 錯誤：開發時就能發現 -->
<button data-i18n="loginnn">Log In</button>
<!-- (如果配合 IDE 插件，可以在 HTML 中也檢查) -->
```

### 8.10 動態內容的翻譯

有些內容是 JavaScript 動態生成的，無法用 `data-i18n`：

```typescript
import { t } from './scripts/i18n/i18n.js';

// ❌ 錯誤：硬編碼文字
function showError() {
  alert('Login failed');
}

// ✅ 正確：使用 t() 函數
function showError() {
  alert(t('loginFailed'));
  // 根據當前語言顯示：
  // en: "Login failed"
  // zh: "登入失敗"
}

// 動態生成 HTML
function createUserCard(user) {
  return `
    <div class="user-card">
      <h3>${user.name}</h3>
      <p>${t('level')}: ${user.level}</p>
      <button>${t('addFriend')}</button>
    </div>
  `;
}

// 監聽語言變更事件，重新生成內容
window.addEventListener('languageChanged', () => {
  // 重新渲染動態內容
  updateUserList();
  updateGameStats();
});
```

### 8.11 最佳實踐

#### 8.11.1 保持 key 有意義

```typescript
// ❌ 不好：key 不清楚
"btn1": "Submit",
"txt2": "Enter your name",

// ✅ 好：key 描述性強
"submitButton": "Submit",
"enterNamePrompt": "Enter your name",
```

#### 8.11.2 分組管理

```typescript
export const translations = {
  en: {
    // === Authentication ===
    "login": "Log In",
    "signup": "Sign Up",
    
    // === 2FA ===
    "2faConfiguration": "2FA Configuration",
    "scanQRCode": "Scan QR code",
    
    // === Profile ===
    "myProfile": "My Profile",
    "editProfile": "Edit Profile",
    
    // === Game ===
    "playPong": "Play Pong",
    "gameOver": "Game Over"
  }
};
```

#### 8.11.3 處理複數形式

英語和中文的複數形式不同：

```typescript
// 英語需要處理複數
"onePoint": "1 point",
"multiplePoints": "{count} points",

// 中文不需要
"points": "{count} 分"

// 使用時
function displayPoints(count: number, lang: Language) {
  if (lang === 'en') {
    return count === 1 ? t('onePoint') : t('multiplePoints').replace('{count}', count);
  } else {
    return t('points').replace('{count}', count);
  }
}
```

#### 8.11.4 避免文字截斷

不同語言的文字長度差異很大：

```css
/* 確保按鈕足夠寬 */
.auth-btn {
  min-width: 120px;  /* 給俄語等長文字留空間 */
  padding: 10px 20px;
}

/* 使用 overflow 處理過長文字 */
.user-name {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

#### 8.11.5 RTL 語言支援（如果需要）

如果將來要支援阿拉伯語、希伯來語等：

```typescript
// 檢測語言方向
function isRTL(lang: Language): boolean {
  return ['ar', 'he'].includes(lang);
}

// 動態設定 dir 屬性
if (isRTL(currentLanguage)) {
  document.documentElement.dir = 'rtl';
} else {
  document.documentElement.dir = 'ltr';
}
```

---

## 📝 Evaluation Defense - Part 6

### 評審可能問的問題：

#### Q26: "什麼是 i18n？你的專案支援哪些語言？"

**回答要點：**
1. **定義**：Internationalization 的縮寫（i 和 n 之間 18 個字母）
2. **目的**：讓應用程式支援多種語言，無需修改代碼
3. **支援的語言**：
   - 🇺🇸 English (en)
   - 🇨🇳 中文 (zh)
   - 🇫🇷 Français (fr)
   - 🇷🇺 Русский (ru)

#### Q27: "如何在 HTML 中使用 i18n？"

**回答要點（展示 4 種方式）：**

1. **data-i18n**（文字內容）：
   ```html
   <button data-i18n="login">Log In</button>
   ```
   
2. **data-i18n-placeholder**（輸入框提示）：
   ```html
   <input data-i18n-placeholder="enterUsername" placeholder="Enter username">
   ```
   
3. **data-i18n-title**（Tooltip）：
   ```html
   <img data-i18n-title="qrCode" alt="QR Code">
   ```
   
4. **data-i18n-prefix**（動態編號）：
   ```html
   <label for="player-1" data-i18n-prefix="player">Player</label>
   <!-- 會變成 "Player 1", "玩家 1" 等 -->
   ```

#### Q28: "語言切換時發生了什麼？"

**回答要點（可以畫流程圖）：**

1. **用戶選擇語言**：點擊語言切換器選單
2. **更新狀態**：
   - 設定 `currentLanguage`
   - 保存到 `localStorage`（下次訪問時記住）
3. **更新 DOM**：
   - 找到所有 `[data-i18n]` 元素
   - 將文字替換為新語言的翻譯
   - 更新 placeholder、title 等屬性
4. **觸發事件**：
   - `languageChanged` 事件
   - 讓動態內容也能更新

**關鍵代碼：**
```typescript
setLanguage(language: Language) {
  this.currentLanguage = language;
  localStorage.setItem('language', language);
  this.updatePageTranslations();  // ← 更新所有文字
  window.dispatchEvent(new CustomEvent('languageChanged'));
}
```

#### Q29: "如何確保翻譯的 key 不會打錯？"

**回答要點：**

1. **TypeScript 類型定義**：
   ```typescript
   export type TranslationKey = keyof typeof translations.en;
   ```
   
2. **編譯時檢查**：
   ```typescript
   t('login');  // ✅ OK
   t('logins');  // ❌ TypeScript 報錯
   ```
   
3. **自動補全**：
   - IDE 會提示所有可用的 key
   - 避免手動輸入錯誤

4. **單一 source of truth**：
   - 所有 key 定義在 `translations.en`
   - 其他語言必須有相同的 key

#### Q30: "初次訪問時，如何決定顯示哪種語言？"

**回答要點（優先級順序）：**

1. **檢查 localStorage**：
   ```typescript
   const savedLanguage = localStorage.getItem('language');
   if (savedLanguage) {
     this.currentLanguage = savedLanguage;  // 使用用戶之前的選擇
   }
   ```
   
2. **偵測瀏覽器語言**：
   ```typescript
   const browserLang = navigator.language.split('-')[0];
   // "zh-TW" → "zh"
   // "en-US" → "en"
   
   if (browserLang in this.translations) {
     this.currentLanguage = browserLang;
   }
   ```
   
3. **使用預設語言**：
   ```typescript
   // 如果都沒有，使用 'en'
   private currentLanguage: Language = 'en';
   ```

**優先級：**
```
localStorage > 瀏覽器語言 > 預設 (en)
```

#### Q31: "動態生成的內容如何翻譯？"

**回答要點：**

1. **使用 t() 函數**：
   ```typescript
   import { t } from './i18n.js';
   
   // 動態生成 HTML
   function createButton() {
     const button = document.createElement('button');
     button.textContent = t('submit');  // ← 使用 t() 函數
     return button;
   }
   ```
   
2. **監聽語言變更**：
   ```typescript
   window.addEventListener('languageChanged', () => {
     // 重新生成動態內容
     updateGameUI();
     updateChatMessages();
   });
   ```
   
3. **不能用 data-i18n 的情況**：
   - JavaScript 生成的 DOM
   - Canvas 繪製的文字
   - WebSocket 訊息
   - Alert/Confirm 對話框

#### Q32: "如何新增一種語言（例如日語）？"

**回答步驟：**

1. **在 translations.ts 添加翻譯**：
   ```typescript
   export const translations = {
     en: { /* ... */ },
     zh: { /* ... */ },
     fr: { /* ... */ },
     ru: { /* ... */ },
     ja: {  // ← 新增日語
       "login": "ログイン",
       "signup": "登録",
       // ... 翻譯所有 key
     }
   };
   ```
   
2. **更新 Language 類型**：
   ```typescript
   export type Language = 'en' | 'zh' | 'fr' | 'ru' | 'ja';
   ```
   
3. **在 getAvailableLanguages() 添加選項**：
   ```typescript
   getAvailableLanguages() {
     return [
       // ...
       { code: 'ja', name: this.translations.ja.japanese }
     ];
   }
   ```
   
4. **在 languageSwitcher.ts 添加國旗**：
   ```typescript
   const flags = {
     'en': '🇺🇸',
     'zh': '🇨🇳',
     'fr': '🇫🇷',
     'ru': '🇷🇺',
     'ja': '🇯🇵'  // ← 新增
   };
   ```

**就這樣！** TypeScript 會確保所有 key 都被翻譯。

---

## 🎓 總結：完整的認證系統

恭喜！你已經完成了所有 6 個部分的學習：

### 📚 知識地圖

```
┌─────────────────────────────────────────────────────────────┐
│              ft_transcendence Authentication                │
└─────────────────────────────────────────────────────────────┘

Part 1: JWT 基礎
  ├─ 什麼是 JWT
  ├─ Session vs Token
  ├─ Access + Refresh Token 雙 token 策略
  └─ 自動刷新機制

Part 2: JWKS & Microservices
  ├─ 公鑰分發機制
  ├─ 微服務如何驗證 JWT
  ├─ Cache 策略
  └─ Key Rotation

Part 3: Google OAuth 2.0
  ├─ Authorization Code Flow
  ├─ 與 Google 的互動流程
  ├─ Temporary Token 機制
  └─ 安全性考量

Part 4: Two-Factor Authentication
  ├─ TOTP 原理
  ├─ QR Code 生成
  ├─ 2FA 設置/驗證/禁用流程
  └─ Backup Codes

Part 5: Route Protection
  ├─ Middleware 概念
  ├─ userSessionMiddleware
  ├─ internalAuthMiddleware
  ├─ userAuthSwitcher
  └─ 安全最佳實踐

Part 6: Multi-language (i18n)
  ├─ Translation 結構
  ├─ i18n Core
  ├─ HTML 中的使用
  ├─ Language Switcher
  └─ TypeScript 類型安全
```

### 🎯 評審防禦策略

**準備 32 個問題的答案**：
- Q1-Q12: JWT & JWKS (Part 1-2)
- Q13-Q18: 2FA (Part 4)
- Q19-Q25: Route Protection (Part 5)
- Q26-Q32: i18n (Part 6)

**展示重點：**
1. **畫流程圖**：視覺化幫助理解
2. **展示代碼**：指出關鍵實作
3. **解釋安全性**：為什麼這樣設計
4. **連貫性**：展示不同部分如何協同工作

### 🔐 安全性檢查清單

- ✅ JWT 使用 RS256 非對稱加密
- ✅ Refresh Token 存儲在 HttpOnly Cookie
- ✅ 短 Access Token 有效期（15 分鐘）
- ✅ JWKS 用於微服務間驗證
- ✅ Google OAuth 使用 Authorization Code Flow
- ✅ 2FA 使用 TOTP 標準
- ✅ Secret 不在網路上傳輸（除了初始 QR Code）
- ✅ Middleware 保護所有敏感路由
- ✅ 所有驗證失敗都有日誌記錄

### 🚀 下一步

你現在已經有完整的認證系統文檔！建議：

1. **複習流程圖**：確保能在白板上畫出來
2. **運行專案**：實際操作每個流程
3. **準備演示**：
   - 正常登入流程
   - Google OAuth 流程
   - 2FA 設置和驗證
   - 語言切換
4. **模擬評審**：找同學互相提問

祝你評審順利！ 🎉

---

**文檔完成日期：2025-11-06**  
**適用於：ft_transcendence 專案評審**
