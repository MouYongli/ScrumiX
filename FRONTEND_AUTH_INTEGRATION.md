# Frontend Authentication Integration with Backend Database

This document describes the integration of the frontend authentication system with the backend database.

## Changes Made

### 1. Authentication System Update (`frontend/src/utils/auth.ts`)
- **Disabled mock authentication**: Set `USE_MOCK_AUTH = false` to force real backend authentication
- **Updated User interface**: Added support for both local users (int IDs) and Keycloak users (string UUIDs)
- **Enhanced compatibility**: Added backend schema fields like `isActive`, `isVerified`, `status`, etc.

### 2. API Integration (`frontend/src/utils/api.ts`)
- **Added auth verification endpoint**: Added `verifyAuth()` function that calls `/api/v1/auth/me`
- **Maintained user profile endpoint**: Kept `getCurrentUser()` for `/api/v1/users/me`

### 3. Login Page Updates (`frontend/src/app/auth/login/page.tsx`)
- **Backend integration**: Login now calls the real backend API at `/api/v1/auth/login`
- **Database sessions**: User sessions are now stored in the backend database via UserSession model
- **HTTP-only cookies**: Authentication uses secure HTTP-only cookies managed by the backend

### 4. Signup Page Updates (`frontend/src/app/auth/signup/page.tsx`)
- **Real registration**: Signup calls `/api/v1/auth/register` endpoint
- **Backend validation**: Form validation now uses backend constraints
- **Consistent OAuth flow**: Keycloak signup uses the same auth utilities as login

### 5. AuthGuard Improvements (`frontend/src/components/auth/AuthGuard.tsx`)
- **Backend verification**: Authentication status is verified with backend on each route
- **Enhanced error handling**: Better handling of authentication failures
- **Conditional provider display**: Only shows auth provider when available

## Backend Authentication Endpoints Used

- `POST /api/v1/auth/login` - User login with email/password
- `POST /api/v1/auth/register` - User registration  
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Authentication verification
- `GET /api/v1/users/me` - User profile information
- `POST /api/v1/auth/refresh` - Token refresh
- `GET /api/v1/auth/oauth/keycloak/authorize` - Keycloak authorization URL
- `POST /api/v1/auth/oauth/keycloak/callback` - Keycloak OAuth callback

## Database Integration

### User Storage
- **Local users**: Stored in `users` table with integer IDs
- **Keycloak users**: Virtual users created from JWT tokens with string UUIDs
- **User sessions**: Tracked in `user_sessions` table with tokens and expiration

### Session Management
- **HTTP-only cookies**: Secure session cookies managed by backend
- **Session tracking**: Database records for all active sessions
- **Automatic cleanup**: Expired sessions are cleaned up by backend

## Environment Configuration

To ensure proper integration, set these environment variables:

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_REAL_AUTH=true

# Backend 
DATABASE_URL=postgresql://user:pass@localhost/scrumix
SECRET_KEY=your-jwt-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Testing the Integration

1. **Start the backend server**:
   ```bash
   cd backend
   make run
   ```

2. **Start the frontend development server**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test login flow**:
   - Navigate to `http://localhost:3000/auth/login`
   - Try logging in with existing user credentials
   - Verify session is stored in database
   - Check that user can access protected routes

4. **Test registration flow**:
   - Navigate to `http://localhost:3000/auth/signup`
   - Create a new user account
   - Verify user is created in database
   - Test login with new credentials

5. **Test Keycloak integration**:
   - Click "Sign in with Keycloak" 
   - Complete OAuth flow
   - Verify virtual user creation
   - Check session management

## Benefits of This Integration

1. **Real Authentication**: Users are now authenticated against the actual database
2. **Session Persistence**: User sessions persist across browser restarts
3. **Security**: HTTP-only cookies protect against XSS attacks
4. **Scalability**: Database-backed sessions support multiple servers
5. **Audit Trail**: All login attempts and sessions are logged
6. **OAuth Support**: Seamless integration with Keycloak and other providers

## Troubleshooting

- **CORS issues**: Ensure backend CORS settings include frontend URL
- **Cookie issues**: Check that backend and frontend are on same domain or properly configured for cross-origin cookies
- **Database connection**: Verify PostgreSQL is running and accessible
- **Environment variables**: Ensure all required environment variables are set
