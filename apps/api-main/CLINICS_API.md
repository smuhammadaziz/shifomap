# Clinics API Documentation

Complete API documentation for the clinics management system.

---

## Database Schema

**Collection:** `clinics` in `projects` database

See `src/modules/clinics/clinics.model.ts` for the complete TypeScript schema.

---

## API Endpoints

Base URL: `http://localhost:8080/v1/clinics`

### 1. Create Clinic (Protected)

**POST** `/v1/clinics/create`

Creates a new clinic with an initial owner. Empty fields (branding, contacts, description, branches, services, doctors) will be populated later by the clinic owner.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <platform-admin-token>
```

**Body:**
```json
{
  "clinicDisplayName": "City Medical Center",
  "clinicUniqueName": "city-medical-center",
  "ownerUserName": "johndoe",
  "ownerDisplayName": "John Doe",
  "ownerPassword": "password123",
  "plan": "starter"
}
```

**Success (201):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "clinicDisplayName": "City Medical Center",
    "clinicUniqueName": "city-medical-center",
    "status": "active",
    "category": [],
    "plan": {
      "type": "starter",
      "startedAt": "2026-01-30T...",
      "expiresAt": null,
      "limits": {
        "maxBranches": 1,
        "maxServices": 5,
        "maxAdmins": 1
      }
    },
    "ranking": {
      "score": 0,
      "boosted": false,
      "updatedAt": "..."
    },
    "rating": {
      "avg": 0,
      "count": 0
    },
    "owners": [
      {
        "_id": "...",
        "role": "owner",
        "userName": "johndoe",
        "displayName": "John Doe",
        "addedAt": "...",
        "isActive": true,
        "lastLoginAt": null
      }
    ],
    "stats": {
      "branchesCount": 0,
      "servicesCount": 0,
      "doctorsCount": 0,
      "adminsCount": 1,
      "bookingsTotal": 0,
      "completedBookings": 0,
      "updatedAt": "..."
    },
    "createdAt": "...",
    "updatedAt": "...",
    "deletedAt": null
  }
}
```

**Errors:**
- 401: Unauthorized (invalid/missing token)
- 409: Clinic unique name or owner username already exists
- 400: Validation failed

---

### 2. Login Clinic Owner (Public)

**POST** `/v1/clinics/login`

Clinic owners login to manage their clinic.

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "username": "johndoe",
  "password": "password123"
}
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "owner": {
      "_id": "...",
      "userName": "johndoe",
      "displayName": "John Doe",
      "role": "owner",
      "clinicId": "...",
      "clinicDisplayName": "City Medical Center"
    },
    "expiresIn": "7d"
  }
}
```

**Errors:**
- 401: Invalid username or password
- 401: Account is not active
- 401: Clinic is not active

---

### 3. Get All Clinics (Protected)

**GET** `/v1/clinics?page=1&limit=100`

Get paginated list of all clinics.

**Headers:**
```
Authorization: Bearer <platform-admin-token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 100)

**Success (200):**
```json
{
  "success": true,
  "data": {
    "clinics": [...],
    "total": 25,
    "page": 1,
    "limit": 100,
    "totalPages": 1
  }
}
```

---

### 4. Get Clinic Details (Protected)

**GET** `/v1/clinics/:id`

Get detailed information about a single clinic including all branches, services, doctors, etc.

**Headers:**
```
Authorization: Bearer <platform-admin-token>
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    // Complete clinic object with all nested data
    "branding": { "logoUrl": null, "coverUrl": null },
    "contacts": { "phone": null, "email": null, "telegram": null },
    "description": { "short": null, "full": null },
    "branches": [],
    "services": [],
    "doctors": [],
    // ... all other fields
  }
}
```

**Errors:**
- 404: Clinic not found
- 401: Unauthorized

---

## Postman Testing

### Step 1: Create Platform Admin
First, create a platform admin to get access token:

```bash
POST http://localhost:8080/v1/auth/createAdmin
Content-Type: application/json

{
  "username": "admin",
  "displayName": "Platform Admin",
  "password": "admin1234"
}
```

### Step 2: Login Platform Admin
```bash
POST http://localhost:8080/v1/auth/loginAdmin
Content-Type: application/json

{
  "username": "admin",
  "password": "admin1234"
}
```

Copy the `token` from response.

### Step 3: Create Clinic
```bash
POST http://localhost:8080/v1/clinics/create
Content-Type: application/json
Authorization: Bearer <your-admin-token>

{
  "clinicDisplayName": "Test Clinic",
  "clinicUniqueName": "test-clinic",
  "ownerUserName": "clinicowner",
  "ownerDisplayName": "Clinic Owner",
  "ownerPassword": "password123",
  "plan": "starter"
}
```

### Step 4: Login Clinic Owner
```bash
POST http://localhost:8080/v1/clinics/login
Content-Type: application/json

{
  "username": "clinicowner",
  "password": "password123"
}
```

You'll get a JWT token for the clinic owner (different from platform admin).

### Step 5: Get All Clinics
```bash
GET http://localhost:8080/v1/clinics?page=1&limit=100
Authorization: Bearer <your-admin-token>
```

### Step 6: Get Clinic Details
```bash
GET http://localhost:8080/v1/clinics/<clinic-id>
Authorization: Bearer <your-admin-token>
```

---

## Frontend Integration

The clinics page at `/dashboard/clinics` now:
- Fetches real clinic data from API
- Displays all clinic information in a table
- Has a "Create" button to add new clinics
- Has a "Details" button to view complete clinic information in a modal
- Shows owners, stats, branches, services, doctors, etc.

The details modal displays:
- Overview (status, plan, created date, ranking)
- Contacts (phone, email, telegram)
- Statistics (branches, services, doctors, admins count)
- Owners list with last login info
- Branches list (if any)
- Services list (if any)
- Doctors list (if any)

---

## Notes

- **Empty fields:** When a clinic is created, these fields are empty:
  - branding (logoUrl, coverUrl)
  - contacts (phone, email, telegram)
  - description (short, full)
  - branches (empty array)
  - services (empty array)
  - doctors (empty array)
  - stats are initialized to 0

- **Plans:**
  - Starter: 1 branch, 10 services, 2 admins
  - Pro: 10 branches, 100 services, 10 admins

- **Owner password:** Hashed with bcrypt (cost 10)
- **JWT tokens:** 7 days expiry by default
- **Unique constraints:** `clinicUniqueName` and `owners.userName` must be unique across all clinics
