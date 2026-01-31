# Postman Testing Guide

Complete guide to test api-main endpoints with Postman.

---

## Prerequisites

1. **MongoDB running** on port specified in `.env` (default: 27017 or 27018)
2. **api-main running**: `cd apps/api-main && pnpm dev`
3. Server should be at: `http://localhost:8080`

---

## Test 1: Health check

Verify the server is running.

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:8080/health`

**Expected Response (200):**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-01-30T10:20:00.000Z"
  }
}
```

---

## Test 2: Create platform admin

Create your first admin account.

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:8080/v1/auth/createAdmin`
- **Headers:**
  - `Content-Type: application/json`
- **Body (raw JSON):**

```json
{
  "username": "admin",
  "displayName": "Super Admin",
  "password": "admin1234"
}
```

**Expected Response (201):**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "displayName": "Super Admin",
    "status": "active",
    "role": "SUPER_ADMIN_SHIFO",
    "access": {
      "permissions": ["ALL"]
    },
    "createdAt": "2026-01-30T10:00:00.000Z",
    "updatedAt": "2026-01-30T10:00:00.000Z"
  }
}
```

**Possible Errors:**

**409 - Username already exists:**

```json
{
  "success": false,
  "error": "Username already exists",
  "code": "CONFLICT"
}
```

**400 - Validation error:**

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "username": ["Username must be at least 2 characters"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

---

## Test 3: Login admin

Login and get JWT token.

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:8080/v1/auth/loginAdmin`
- **Headers:**
  - `Content-Type: application/json`
- **Body (raw JSON):**

```json
{
  "username": "admin",
  "password": "admin1234"
}
```

**Expected Response (200):**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2Nzk...",
    "admin": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "admin",
      "displayName": "Super Admin",
      "status": "active",
      "role": "SUPER_ADMIN_SHIFO",
      "access": {
        "permissions": ["ALL"]
      }
    },
    "expiresIn": "7d"
  }
}
```

**Important:** Copy the `token` value. You'll need it for protected routes.

**Possible Errors:**

**401 - Invalid credentials:**

```json
{
  "success": false,
  "error": "Invalid username or password",
  "code": "UNAUTHORIZED"
}
```

**401 - Account not active:**

```json
{
  "success": false,
  "error": "Account is not active",
  "code": "UNAUTHORIZED"
}
```

---

## Test 4: Change password

Change the admin password (requires authentication).

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:8080/v1/auth/changePassword`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <your-token-from-login>`
- **Body (raw JSON):**

```json
{
  "currentPassword": "admin1234",
  "newPassword": "newpassword123"
}
```

**Expected Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Password updated successfully"
  }
}
```

**Important:** After changing password:
1. You'll need to login again with the new password
2. Your old JWT token remains valid until it expires (7 days)
3. Use the new password for all future logins

**Possible Errors:**

**401 - Current password incorrect:**

```json
{
  "success": false,
  "error": "Current password is incorrect",
  "code": "UNAUTHORIZED"
}
```

**401 - Missing or invalid token:**

```json
{
  "success": false,
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

**400 - Validation error:**

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "newPassword": ["New password must be at least 8 characters"]
  }
}
```

---

## Test 5: Using protected routes (future)

When you add protected routes, include the JWT token in the Authorization header.

**Request example:**

- **Method:** `GET`
- **URL:** `http://localhost:8080/v1/protected-route`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Token format:** `Bearer <token>`

---

## Postman Collection

You can save these requests in a Postman collection:

1. **Folder:** api-main
2. **Requests:**
   - Health check (GET /health)
   - Create admin (POST /v1/auth/createAdmin)
   - Login admin (POST /v1/auth/loginAdmin)
3. **Environment variables:**
   - `base_url`: `http://localhost:8080`
   - `admin_token`: (set after login)

Then use `{{base_url}}` and `{{admin_token}}` in your requests.

---

## Troubleshooting

### CORS errors

If you get CORS errors from frontend:

- The `@elysiajs/cors` plugin is enabled with `origin: true` (allows all)
- For production, set `origin` to your frontend domain(s)

### MongoDB connection errors

```
MongoServerSelectionError: connect ECONNREFUSED
```

- Check MongoDB is running: `mongod` or `brew services start mongodb-community`
- Verify `MONGODB_URI` in `.env` matches your MongoDB port (usually 27017 or 27018)

### Validation errors

```
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": { ... }
}
```

- Check your request body matches the schema
- Username: 2-64 chars, letters/numbers/_ - only
- Password: minimum 8 chars
- DisplayName: 1-128 chars

---

## Database verification

Check your MongoDB data:

```bash
# Connect to MongoDB
mongosh

# Switch to your database
use projects

# View admins
db.platform_admin.find().pretty()

# Count admins
db.platform_admin.countDocuments()

# Find specific admin
db.platform_admin.findOne({ username: "admin" })
```
