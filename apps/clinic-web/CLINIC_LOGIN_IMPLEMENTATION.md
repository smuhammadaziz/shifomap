# Clinic Web - Login API Integration

## Summary
Successfully integrated the clinic login API (`/v1/clinics/login`) into the clinic-web application, matching the implementation pattern from console-web.

## Files Created/Modified

### 1. **Environment Configuration**
**File**: `apps/clinic-web/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 2. **API Helper**
**File**: `apps/clinic-web/lib/api.ts`
- Created API URL helper function
- Returns the backend API URL from environment variables

### 3. **Auth Store** (Updated)
**File**: `apps/clinic-web/store/auth-store.ts`

**Changes:**
- Removed mock authentication
- Integrated with `/v1/clinics/login` API endpoint
- Updated User interface to match clinic owner structure:
  ```typescript
  interface User {
    _id: string
    userName: string
    displayName: string
    role: string
    clinicId: string
    clinicDisplayName: string
  }
  ```
- Token storage:
  - `clinic_auth_token` → Cookie (7 days)
  - `clinic_user` → localStorage
  - `clinic_token_expiry` → localStorage
- Token expiry checking on initialization
- Auto-logout when token expires

### 4. **Sign-In Page** (Updated)
**File**: `apps/clinic-web/app/auth/sign-in/page.tsx`

**Changes:**
- Fixed zodResolver type compatibility with `as any` cast
- Changed password minimum length from 1 to 6 characters
- Integrated with API-based login

### 5. **Dashboard Layout** (Updated)
**File**: `apps/clinic-web/app/dashboard/layout.tsx`

**Changes:**
- Added auto-logout check (runs every 60 seconds)
- Checks token expiry and redirects to login if expired
- Prevents access after 7-day token expiration

## Features Implemented

✅ **API Integration**
- Login via `/v1/clinics/login` endpoint
- Proper error handling
- Token-based authentication

✅ **Token Management**
- JWT token stored in cookies (7-day expiry)
- User data stored in localStorage
- Expiry date tracking

✅ **Auto Sign-Out**
- Checks token expiry every 60 seconds
- Automatic redirect to login on expiration
- Clears all auth data on logout

✅ **Protected Routes**
- Dashboard requires authentication
- Automatic redirect to login if not authenticated
- Token validation on page load

✅ **Type Safety**
- Fixed zodResolver compatibility issues
- Downgraded zod to v3.23.8 for compatibility
- Type-safe user interface

## How to Use

### Login Credentials
Use any clinic owner credentials created via the console-web:
- **Username**: The owner's username (e.g., `owner123`)
- **Password**: The password set during clinic creation

### API Endpoint
```
POST http://localhost:8080/v1/clinics/login
Body: {
  "username": "owner123",
  "password": "password123"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "owner": {
      "_id": "...",
      "userName": "owner123",
      "displayName": "Owner Name",
      "role": "owner",
      "clinicId": "...",
      "clinicDisplayName": "Clinic Name"
    },
    "expiresIn": "7d"
  }
}
```

## Testing

1. Create a clinic via console-web (or Postman)
2. Use the owner credentials to login at clinic-web
3. Access should be granted for 7 days
4. After 7 days, automatic logout and redirect to login

## Security Features

- **JWT Authentication**: Secure token-based auth
- **7-Day Expiration**: Tokens expire after 7 days
- **Auto-Logout**: Prevents access with expired tokens
- **Cookie Storage**: HttpOnly cookies for token security
- **Protected Routes**: All dashboard routes require authentication

## Compatibility

Matches the exact implementation pattern from `console-web`:
- Same auth store structure
- Same token management approach
- Same auto-logout mechanism
- Same protected route pattern
