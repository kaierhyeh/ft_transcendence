# Auth Service API Usage Guide

**⚠️⚠️⚠️ No more up to do date as for now ⚠️⚠️⚠️**

## Three JWT Types Explained

This authentication service provides three different JWT types, each with its specific purpose and use case:

### 1. USER_SESSION 🔐 (User Session)
**Purpose**: Traditional web application user authentication
**Features**: 
- Access Token: 15-minute validity
- Refresh Token: 7-day validity  
- Automatic refresh mechanism
- Cookie-based storage

**API Usage Example**:
```typescript
// Login to get USER_SESSION tokens
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'user', password: 'pass' })
});

const result = await response.json();

// Using USER_SESSION middleware to protect routes
import { userSessionMiddleware } from '../middleware/auth.middleware';

app.post('/protected-route', {
  preHandler: userSessionMiddleware  // Validate user session
}, async (request, reply) => {
  const userId = request.user.userId; // From middleware
  // Handle authenticated user request
});
```

### 2. GAME_SESSION 🎮 (Game Session)
**Purpose**: Game-specific temporary session authentication
**Features**:
- Single Token: Default 2-hour validity
- Contains userId and gameId
- No auto-refresh (games have fixed time)
- Perfect for real-time gaming scenarios

**Game Service can use it like this**:
```typescript
// In ~/develop/srcs/backend/game/src/routes

// 1. Create game session (call Auth Service)
async function createGameSession(userId: number, gameId: string) {
  const response = await fetch('http://auth-service:3001/game/session/create', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': userSessionCookie // Need USER_SESSION first
    },
    body: JSON.stringify({ gameId, expiryMinutes: 120 })
  });
  
  const result = await response.json();
  return result.gameToken;
}

// 2. Validate game session in Game Service
app.get('/game/:gameId/state', {
  preHandler: async (request, reply) => {
    const gameToken = request.headers.authorization?.replace('Bearer ', '');
    
    if (!gameToken) {
      return reply.code(401).send({ error: 'Game token required' });
    }
    
    // Validate GAME_SESSION token with Auth Service
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
  // Handle validated game request
  const { userId, gameId } = request.user;
  // Return game state
});
```

### 3. INTERNAL_ACCESS 🔧 (Internal Service)
**Purpose**: Authentication for inter-microservice communication
**Features**:
- Single Token: Default 1-hour validity
- Contains serviceId and permissions
- Long lifecycle, suitable for service-to-service communication
- Permission control system

**Other microservices can use it like this**:
```typescript
// Example: Chat Service needs to validate user information

// 1. Chat Service gets internal token on startup
async function initInternalAuth() {
  const response = await fetch('http://auth-service:3001/internal/token/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: 'chat-service',
      permissions: ['read', 'users:validate'],
      secretKey: process.env.INTERNAL_SERVICE_SECRET
    })
  });
  
  const result = await response.json();
  return result.internalToken;
}

// 2. Chat Service uses internal API to validate user
async function validateUser(userId: number, internalToken: string) {
  const response = await fetch(`http://auth-service:3001/internal/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${internalToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    return null;
  }
  
  const result = await response.json();
  return result.userData;
}

// 3. Batch validate users
async function validateMultipleUsers(userIds: number[], internalToken: string) {
  const response = await fetch('http://auth-service:3001/internal/users/validate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${internalToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userIds })
  });
  
  const result = await response.json();
  return result.validationResults;
}
```

## JWKS Endpoint Usage

Other microservices can get public keys from the JWKS endpoint to independently verify JWTs:

```typescript
// Get JWKS public keys
const jwksResponse = await fetch('http://auth-service:3001/.well-known/jwks.json');
const jwks = await jwksResponse.json();

// Verify tokens using jsonwebtoken and jwks-rsa
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: 'http://auth-service:3001/.well-known/jwks.json'
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// Verify any type of JWT
function verifyToken(token: string) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { 
      algorithms: ['RS256'] 
    }, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
}

// Usage example
const gamePayload = await verifyToken(gameToken);
console.log(`User ${gamePayload.userId} in game ${gamePayload.gameId}`);
```

## Security Features

### RSA Key Architecture
- **Three Independent Key Pairs**: Each JWT type uses dedicated RSA-2048 key pairs
- **Key Isolation**: USER_SESSION, GAME_SESSION, INTERNAL_ACCESS cannot validate each other
- **RS256 Algorithm**: RSA signature with SHA-256, providing high security
- **JWKS Support**: Standardized public key distribution mechanism

### Security Validation in Tests
```typescript
// Test ensures cross-type verification fails
const userToken = jwtService.generateUserSessionToken({ username: 'test' });
const gameValidation = jwtService.validateToken(userToken, 'GAME_SESSION');
// Result: { valid: false, error: 'invalid signature' }
```

### Key Management
- **Dynamic Key Generation**: New key pairs generated for each test run
- **Key Identification**: Each key has unique Key ID (kid)
- **Public Key Distribution**: Public keys provided via JWKS endpoint for verification

## Test Suite Usage Guide
```

## TypeScript Type Definitions

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

## Summary

- **USER_SESSION**: Web application user authentication, uses cookies, 15-minute access token
- **GAME_SESSION**: Game-specific sessions, short-term validity, 2-hour Bearer token
- **INTERNAL_ACCESS**: Inter-microservice communication, 1-hour validity, permission control

Each type has dedicated middleware, providing complete type safety and auto-completion features.

### Test Coverage
- ✅ Complete JWT generation and validation tests
- ✅ RSA key security testing
- ✅ JWKS endpoint functionality tests
- ✅ Cross-type verification blocking tests
- ✅ Docker containerized testing environment