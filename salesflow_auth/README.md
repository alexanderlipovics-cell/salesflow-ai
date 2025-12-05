# SalesFlow AI - JWT Authentication System

Production-ready JWT authentication implementation for FastAPI with Supabase.

## Features

- ✅ **JWT Access Tokens** (24h expiry)
- ✅ **Refresh Tokens** (30 days expiry, rotation on use)
- ✅ **Role-Based Access Control** (user, admin)
- ✅ **Token Blacklist** (secure logout)
- ✅ **Rate Limiting** (5 attempts per 5 minutes)
- ✅ **Password Security** (bcrypt hashing, strength validation)
- ✅ **Comprehensive Test Suite**

## Project Structure

```
salesflow_auth/
├── app/
│   ├── core/
│   │   ├── auth.py         # JWT creation & validation
│   │   ├── security.py     # Password hashing
│   │   ├── deps.py         # FastAPI dependencies
│   │   └── config.py       # Settings management
│   ├── schemas/
│   │   └── auth.py         # Pydantic models
│   ├── routers/
│   │   └── auth.py         # Auth endpoints
│   ├── db/
│   │   └── supabase.py     # Database client
│   └── main.py             # FastAPI application
├── migrations/
│   └── 001_auth_tables.sql # Database schema
├── tests/
│   ├── conftest.py         # Test fixtures
│   └── test_auth.py        # Test suite
├── requirements.txt
├── .env.example
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values

# Generate secrets:
openssl rand -hex 32  # For JWT_SECRET_KEY
openssl rand -hex 32  # For JWT_REFRESH_SECRET_KEY
```

### 3. Run Database Migration

Execute `migrations/001_auth_tables.sql` in your Supabase SQL Editor.

### 4. Start the Server

```bash
uvicorn app.main:app --reload
```

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/signup` | Register new user |
| POST | `/api/v1/auth/login` | Authenticate user |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout (blacklist token) |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/change-password` | Change password |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/admin/deactivate/{user_id}` | Deactivate user |
| POST | `/api/v1/auth/admin/activate/{user_id}` | Reactivate user |

---

## API Reference

### POST `/api/v1/auth/signup`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  },
  "tokens": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 86400
  }
}
```

**Errors:**
- `400` - Weak password
- `409` - Email already registered
- `422` - Validation error

---

### POST `/api/v1/auth/login`

Authenticate user and get tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "user": { ... },
  "tokens": { ... }
}
```

**Errors:**
- `401` - Invalid credentials
- `403` - Account deactivated
- `429` - Too many attempts (rate limited)

---

### POST `/api/v1/auth/refresh`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJ..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

**Note:** Refresh tokens are rotated on each use for security.

---

### POST `/api/v1/auth/logout`

Logout and invalidate tokens.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Successfully logged out",
  "success": true
}
```

---

### GET `/api/v1/auth/me`

Get current authenticated user info.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "user",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## Using Authentication in Other Routes

```python
from fastapi import APIRouter, Depends
from app.core.deps import get_current_user, get_current_admin_user
from app.schemas.auth import UserInDB

router = APIRouter()

# Require any authenticated user
@router.get("/protected")
async def protected_route(current_user: UserInDB = Depends(get_current_user)):
    return {"message": f"Hello, {current_user.full_name}!"}

# Require admin role
@router.get("/admin-only")
async def admin_route(current_user: UserInDB = Depends(get_current_admin_user)):
    return {"message": "Admin access granted"}
```

---

## Security Best Practices Implemented

1. **Password Security**
   - bcrypt hashing with 12 rounds
   - Strength validation (8+ chars, upper, lower, digit)
   - No password stored in plaintext

2. **Token Security**
   - Short-lived access tokens (24h)
   - Refresh token rotation
   - Token blacklisting on logout
   - Separate secrets for access/refresh tokens

3. **Rate Limiting**
   - 5 login attempts per 5 minutes per IP
   - Automatic reset on successful login

4. **Database Security**
   - Hashed refresh tokens in DB
   - Row Level Security (RLS) enabled
   - Service role key for backend only

---

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v
```

---

## Production Checklist

- [ ] Generate strong JWT secrets (`openssl rand -hex 32`)
- [ ] Set `DEBUG=false`
- [ ] Use HTTPS only
- [ ] Set `COOKIE_SECURE=true`
- [ ] Configure proper CORS origins
- [ ] Set up token cleanup cron job
- [ ] Use Redis for distributed rate limiting
- [ ] Enable database connection pooling
- [ ] Set up monitoring and alerting

---

## License

MIT License - SalesFlow AI
