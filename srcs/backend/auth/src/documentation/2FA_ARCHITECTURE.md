# 2FA (Two-Factor Authentication) Architecture

## Overview
Complete TOTP-based 2FA system integrated with Google OAuth and user settings.

---

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Browser                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ↓ HTTP POST /auth/2fa/setup
                               │
┌──────────────────────────────┴──────────────────────────────────────┐
│                     Backend-Auth (Node.js/Fastify)                   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              userSessionMiddleware                          │    │
│  │  - Validates USER_SESSION JWT from cookies                  │    │
│  │  - Auto-refreshes expired access tokens                     │    │
│  │  - Attaches userId to request.user                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                               ↓                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Route Handler (/auth/2fa/setup)                │    │
│  │  1. Check if 2FA already enabled                            │    │
│  │  2. Generate TOTP secret (speakeasy)                        │    │
│  │  3. Store secret in Redis (10 min TTL)                      │    │
│  │  4. Generate QR code (qrcode library)                       │    │
│  │  5. Return QR code data URL to frontend                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                               ↓                                       │
│         usersClient.get2FAStatus(userId)                             │
│                   fetch() + INTERNAL_ACCESS JWT                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ↓
┌──────────────────────────────┴──────────────────────────────────────┐
│                  Backend-Users (Node.js/Fastify)                     │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │           internalAuthMiddleware                            │    │
│  │  - Validates INTERNAL_ACCESS JWT                            │    │
│  │  - Authenticates service-to-service calls                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                               ↓                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │           Route Handler (PUT /users/:uid/2fa)               │    │
│  │  - Updates two_fa_enabled field                             │    │
│  │  - Updates two_fa_secret field                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                               ↓                                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ↓
┌──────────────────────────────┴──────────────────────────────────────┐
│                    SQLite Database (users.db)                        │
│                                                                       │
│  Fields:                                                              │
│  - two_fa_enabled (INTEGER: 0 or 1)                                 │
│  - two_fa_secret (TEXT: base32 encoded secret or NULL)              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ↓ Response with updated data
                               │
┌──────────────────────────────┴──────────────────────────────────────┐
│                       Backend-Auth                                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Redis (Temporary Storage)                │    │
│  │  Key: 2fa_setup_${userId}                                   │    │
│  │  Value: TOTP secret (base32)                                │    │
│  │  TTL: 600 seconds (10 minutes)                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                               ↓                                       │
│  Generate QR code data URL → Return to frontend                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ↓
┌──────────────────────────────┴──────────────────────────────────────┐
│                          User Actions                                │
│  1. User scans QR code with authenticator app                       │
│  2. App generates 6-digit TOTP code                                 │
│  3. User submits code via frontend                                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ↓ HTTP POST /auth/2fa/activate {token}
                               │
┌──────────────────────────────┴──────────────────────────────────────┐
│                       Backend-Auth                                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │          Route Handler (/auth/2fa/activate)                 │    │
│  │  1. Retrieve temp secret from Redis                         │    │
│  │  2. Verify TOTP code with speakeasy.totp.verify()          │    │
│  │  3. If valid: usersClient.update2FASettings(true, secret)  │    │
│  │  4. Delete temp secret from Redis                           │    │
│  │  5. Return success response                                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ↓
                    Database permanently updated
                         2FA now active!
```

---

## API Endpoints

### Backend-Auth Service

#### `POST /auth/2fa/setup`
- **Auth:** USER_SESSION JWT (userSessionMiddleware)
- **Purpose:** Generate QR code for 2FA setup
- **Response:** `{ success: true, qrCode: "data:image/png;base64,...", secret: "BASE32STRING", otpauth_url: "otpauth://..." }`
- **Side Effects:** Stores secret in Redis with 10-minute TTL

#### `POST /auth/2fa/activate`
- **Auth:** USER_SESSION JWT (userSessionMiddleware)
- **Body:** `{ token: "123456" }`
- **Purpose:** Verify 6-digit code and enable 2FA permanently
- **Response:** `{ success: true, message: "2FA successfully activated." }`
- **Side Effects:** Updates database, removes Redis temp secret

#### `POST /auth/2fa/verify`
- **Auth:** None (uses temp_token from body)
- **Body:** `{ token: "123456", temp_token: "TEMP_JWT" }`
- **Purpose:** Verify 2FA during login
- **Response:** `{ success: true, username: "...", id: 123 }` + Sets cookies
- **Side Effects:** Sets USER_SESSION cookies

#### `POST /auth/2fa/disable`
- **Auth:** USER_SESSION JWT (userSessionMiddleware)
- **Purpose:** Disable 2FA for user account
- **Response:** `{ success: true, message: "2FA has been disabled." }`
- **Side Effects:** Updates database to remove secret

#### `GET /auth/2fa/status`
- **Auth:** USER_SESSION JWT (userSessionMiddleware)
- **Purpose:** Check if 2FA is enabled
- **Response:** `{ success: true, enabled: true/false }`

### Backend-Users Service

#### `PUT /users/:uid/2fa`
- **Auth:** INTERNAL_ACCESS JWT (internalAuthMiddleware)
- **Body:** `{ enabled: boolean, secret: string | null }`
- **Purpose:** Update 2FA settings in database
- **Response:** `{ user_id: 123, two_fa_enabled: 1, two_fa_secret: "..." }`

---

## Database Schema

### Table: `users`

| Column            | Type    | Description                          |
|-------------------|---------|--------------------------------------|
| `user_id`         | INTEGER | Primary key                          |
| `two_fa_enabled`  | INTEGER | 0 = disabled, 1 = enabled           |
| `two_fa_secret`   | TEXT    | Base32 encoded TOTP secret or NULL  |

---

## Redis Keys

| Key                      | Value Type | TTL    | Purpose                        |
|--------------------------|------------|--------|--------------------------------|
| `2fa_setup_${userId}`    | STRING     | 600s   | Temporary TOTP secret during setup |

---

## Google OAuth Integration Flow

```
1. User clicks "Login with Google"
2. OAuth redirect → Google authentication
3. Callback returns to /auth/google/callback
4. Backend checks: usersClient.get2FAStatus(userId)
5. If 2FA enabled:
   - Generate temp_token (5-minute JWT)
   - Return: { requires_2fa: true, temp_token: "..." }
   - Frontend shows 2FA verification modal
6. If 2FA disabled:
   - Generate access/refresh tokens
   - Set cookies
   - Return user data
```

---

## Frontend Components

### Settings Page (`settings.ts`)
- **Enable 2FA Button:** Triggers QR code modal
- **Disable 2FA Button:** Confirms and disables 2FA
- **Modal Features:**
  - QR code display
  - 6-digit code input with auto-focus
  - Enter key to submit
  - ESC key to cancel
  - Click outside to close

### Login/Sections Page (`sections.ts`)
- **2FA Verification Modal:** Shown when `requires_2fa === true`
- **Verification Flow:**
  1. User enters 6-digit code
  2. POST /auth/2fa/verify with temp_token
  3. On success: Sets cookies and redirects
  4. On failure: Shows error message

---

## Security Considerations

1. **TOTP Secrets:** Stored base32-encoded in database
2. **Temporary Secrets:** 10-minute expiry in Redis
3. **Temp Tokens:** 5-minute JWT for OAuth 2FA flow
4. **Service-to-Service:** INTERNAL_ACCESS JWT required for backend-users calls
5. **User Authentication:** All routes protected with userSessionMiddleware
6. **Token Validation:** Time-based windows for TOTP codes

---

## Dependencies

- **speakeasy:** TOTP generation and verification
- **qrcode:** QR code image generation
- **redis:** Temporary secret storage
- **better-sqlite3:** SQLite database (backend-users)

---

## Common Issues & Solutions

### Issue: 504 Gateway Timeout on disable
**Cause:** UsersClient.update2FASettings() not returning response
**Solution:** Added `return data;` statement after `response.json()`

### Issue: Routes not executing after code changes
**Cause:** Docker image has no volume mount, code is baked in at build time
**Solution:** Run `docker compose build backend-auth` after every code change

### Issue: logger.audit() crashes handler
**Cause:** audit() method commented out in container.ts
**Solution:** Comment out all logger.audit() calls in routes

---

## Testing Checklist

- [ ] Enable 2FA from settings
- [ ] QR code displays correctly
- [ ] Activate with valid 6-digit code
- [ ] Invalid code shows error
- [ ] Button updates to "Disable 2FA"
- [ ] Disable 2FA works
- [ ] Google OAuth prompts for 2FA when enabled
- [ ] 2FA verification works during login
- [ ] Auto-focus on input fields
- [ ] Keyboard shortcuts (Enter, ESC) work
- [ ] Click outside modal closes it
- [ ] Can re-enable after disabling

---

## Future Improvements

- [ ] Add backup codes for account recovery
- [ ] Implement remember device functionality
- [ ] Add 2FA requirement enforcement at admin level
- [ ] Support for multiple 2FA methods (SMS, email)
- [ ] Audit logging for 2FA events
- [ ] Rate limiting on verification attempts
