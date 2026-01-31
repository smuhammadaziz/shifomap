# Quick Start Guide

Get api-main running in 3 steps.

---

## Step 1: MongoDB

Start MongoDB on your machine:

```bash
# If using Homebrew on Mac
brew services start mongodb-community

# Or run directly
mongod

# Check it's running (default port 27017 or 27018)
mongosh
```

---

## Step 2: Configure

Copy `.env.example` to `.env`:

```bash
cd apps/api-main
cp .env.example .env
```

Edit `.env` if needed (MongoDB port, JWT secret, etc.).

**Important:** Make sure `MONGODB_URI` port matches your MongoDB port!

```env
# Default
MONGODB_URI=mongodb://localhost:27017

# Or if using 27018
MONGODB_URI=mongodb://localhost:27018
```

---

## Step 3: Run

```bash
pnpm dev
```

You should see:

```
[INFO] MongoDB connected
[INFO] Indexes created
[INFO] api-main running at http://localhost:8080
```

Server is ready at `http://localhost:8080`.

---

## Test with curl

### Create admin:

```bash
curl -X POST http://localhost:8080/v1/auth/createAdmin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "displayName": "Super Admin",
    "password": "admin1234"
  }'
```

### Login:

```bash
curl -X POST http://localhost:8080/v1/auth/loginAdmin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin1234"
  }'
```

You'll get a `token` in the response. Copy it for protected routes.

---

## Test with console-web

If you have console-web running on port 4000:

1. Make sure `.env.local` in console-web has:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

2. Start console-web:
   ```bash
   cd apps/console-web
   pnpm dev
   ```

3. Open `http://localhost:4000`

4. Login with the admin credentials you created

The console-web dashboard will call the api-main `/v1/auth/loginAdmin` endpoint.

---

## Postman

See `POSTMAN_GUIDE.md` for detailed Postman testing instructions with request/response examples.
