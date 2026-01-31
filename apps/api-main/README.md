# api-main

Backend API using **Elysia** (Bun runtime) + **MongoDB** + **JWT** authentication.

---

## Project structure

```
apps/api-main/
  src/
    main.ts                 # Bootstrap: connect MongoDB, create indexes, start server
    app.ts                  # Elysia app + CORS + global error handler
    env.ts                  # Environment validation (Zod)

    db/
      mongo.ts              # MongoDB connection, getDb(), collection names
      indexes.ts            # Create indexes for platform_admin

    common/
      errors.ts             # AppError, unauthorized, conflict, etc.
      logger.ts             # Simple logger (dev/prod)
      middleware/
        auth.ts             # JWT sign/verify, requireAuth plugin
      utils/
        id.ts               # ObjectId helpers

    modules/
      health/
        health.routes.ts    # GET /health

      users/
        users.routes.ts     # GET /v1/users (placeholder)
        users.service.ts
        users.repo.ts
        users.model.ts
        users.dto.ts

      auth/
        auth.routes.ts      # POST /v1/auth/createAdmin, /loginAdmin
        auth.service.ts     # Business logic: createAdmin, loginAdmin
        auth.repo.ts        # MongoDB queries: insertAdmin, findAdminByUsername, updateLastLogin
        auth.model.ts       # TypeScript types, Zod schemas, mapping
        auth.dto.ts         # Request/response DTOs

    shared/
      types.ts              # ApiResponse, PaginatedResponse
      constants.ts          # ADMIN_ROLE, PERMISSION_ALL

  .env                      # Environment variables
  .env.example              # Template
  package.json
  tsconfig.json
```

---

## Setup

### 1. MongoDB

Make sure MongoDB is running:

```bash
# Default port: 27017
# If using port 27018, update .env
mongod
```

### 2. Environment

Copy `.env.example` to `.env` and set:

```env
PORT=8080
NODE_ENV=development

# MongoDB - database name is "projects", collection is "platform_admin"
MONGODB_URI=mongodb://localhost:27018
MONGODB_DB_NAME=projects

# JWT secret for admin tokens
JWT_SECRET=your-super-secret-key-change-in-production
JWT_ISSUER=api-main
JWT_EXPIRES_IN=7d
```

### 3. Install and run

```bash
pnpm install
pnpm dev
```

Server runs at `http://localhost:8080` (or `PORT` from `.env`).

---

## API endpoints

Base URL: `http://localhost:8080`

### Health check

**GET** `/health`

Response (200):

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-01-30T10:15:00.000Z"
  }
}
```

---

## Platform Admin API

### 1. Create admin (public)

**POST** `/v1/auth/createAdmin`

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "username": "admin",
  "displayName": "Super Admin",
  "password": "admin1234"
}
```

**Success (201):**

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

**Error (409 - username exists):**

```json
{
  "success": false,
  "error": "Username already exists",
  "code": "CONFLICT"
}
```

**Error (400 - validation):**

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

### 2. Login admin (public)

**POST** `/v1/auth/loginAdmin`

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "username": "admin",
  "password": "admin1234"
}
```

**Success (200):**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
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

**Error (401 - invalid credentials):**

```json
{
  "success": false,
  "error": "Invalid username or password",
  "code": "UNAUTHORIZED"
}
```

**Error (401 - account not active):**

```json
{
  "success": false,
  "error": "Account is not active",
  "code": "UNAUTHORIZED"
}
```

---

### 3. Change password (protected)

**POST** `/v1/auth/changePassword`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <your-jwt-token>
```

**Body:**

```json
{
  "currentPassword": "admin1234",
  "newPassword": "newpassword123"
}
```

**Success (200):**

```json
{
  "success": true,
  "data": {
    "message": "Password updated successfully"
  }
}
```

**Error (401 - wrong current password):**

```json
{
  "success": false,
  "error": "Current password is incorrect",
  "code": "UNAUTHORIZED"
}
```

**Error (401 - no token or expired token):**

```json
{
  "success": false,
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

**Error (400 - validation):**

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

## Testing with Postman

### Step 1: Create admin

1. Open Postman
2. Create new request:
   - **Method:** `POST`
   - **URL:** `http://localhost:8080/v1/auth/createAdmin`
   - **Headers:** `Content-Type: application/json`
   - **Body (raw JSON):**
     ```json
     {
       "username": "admin",
       "displayName": "Super Admin",
       "password": "admin1234"
     }
     ```
3. Send request
4. You should get **201** with admin data

### Step 2: Login admin

1. Create new request:
   - **Method:** `POST`
   - **URL:** `http://localhost:8080/v1/auth/loginAdmin`
   - **Headers:** `Content-Type: application/json`
   - **Body (raw JSON):**
     ```json
     {
       "username": "admin",
       "password": "admin1234"
     }
     ```
2. Send request
3. You should get **200** with `token` and `admin` data
4. Copy the `token` value for protected routes

### Step 3: Use token for protected routes

For any protected endpoint (future):

- **Header:** `Authorization: Bearer <your-token-here>`

---

## MongoDB schema

**Database:** `projects` (from `MONGODB_DB_NAME`)  
**Collection:** `platform_admin`

**Document structure:**

```typescript
{
  _id: ObjectId,
  username: string,              // unique, lowercase
  displayName: string,
  status: string,                // "active" | "inactive"
  role: "SUPER_ADMIN_SHIFO",
  access: {
    permissions: ["ALL"]
  },
  security: {
    passwordHash: string,        // bcrypt hash
    passwordUpdatedAt: Date,
    lastLoginAt: Date | null,
    lastLoginIP: string | null
  },
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date | null         // soft delete
}
```

**Indexes:**

- `username` (unique)
- `status`
- `security.lastLoginAt` (desc)
- `deletedAt`

---

## Tech stack

- **Runtime:** Bun
- **Framework:** Elysia 1.4+
- **Database:** MongoDB (native driver)
- **Validation:** Zod
- **Auth:** JWT (jose library)
- **Password:** Bcrypt (Bun.password)
- **CORS:** @elysiajs/cors

---

## Development

- `pnpm dev` - Start with hot reload
- `pnpm start` - Start production
- `pnpm typecheck` - Type check without emit

---

## Notes

- **CORS:** Allows all origins in dev (`origin: true`). Set to specific domain(s) in production.
- **JWT expiry:** Default 7 days (`JWT_EXPIRES_IN=7d`).
- **Password:** Bcrypt with cost 10.
- **Validation:** Zod schemas validated manually in routes with detailed error responses.
