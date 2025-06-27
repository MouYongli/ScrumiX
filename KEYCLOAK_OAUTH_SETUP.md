# Keycloak OAuth Integration Setup (Frontend-Only User Storage)

This document describes how to set up and test the Keycloak OAuth integration for ScrumiX with user data stored only in the frontend (localStorage).

## 🎯 Features

- ✅ Added Keycloak login button to the login page
- ✅ OAuth authorization flow through Keycloak
- ✅ User data stored in frontend localStorage (not in database)
- ✅ Direct Keycloak token usage for authentication
- ✅ Simplified backend implementation

## 🏗️ Backend Implementation

- ✅ OAuth authorization endpoint: `GET /api/v1/auth/oauth/keycloak/authorize`
- ✅ OAuth callback endpoints:
  - `GET /api/v1/auth/oauth/keycloak/callback` (Keycloak redirects here)
  - `POST /api/v1/auth/oauth/keycloak/callback` (Frontend calls this to exchange code for tokens)

## 📋 Environment Variables

Add these to your backend `.env` file:

```bash
# Keycloak Configuration
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=scrumix-app
KEYCLOAK_CLIENT_ID=scrumix-client
KEYCLOAK_CLIENT_SECRET=your-client-secret

# URL Configuration
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

Add this to your frontend `.env.local` file:

```bash
# Frontend Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🔄 OAuth Flow

1. **User clicks "Sign in with Keycloak"** on login page
2. **Frontend requests authorization URL** from backend (`GET /api/v1/auth/oauth/keycloak/authorize`)
3. **Frontend redirects user** to Keycloak login page
4. **User authenticates** with Keycloak
5. **Keycloak redirects** to backend callback (`GET /api/v1/auth/oauth/keycloak/callback`)
6. **Backend redirects** to frontend with code and state parameters
7. **Frontend exchanges code** for tokens (`POST /api/v1/auth/oauth/keycloak/callback`)
8. **Frontend stores** Keycloak tokens and user data in localStorage
9. **User is redirected** to workspace

## 🗂️ Frontend Data Storage

User data is stored in `localStorage` with these keys:

- `keycloak_access_token` - Keycloak access token
- `keycloak_refresh_token` - Keycloak refresh token (if available)
- `token_expires_at` - Token expiration timestamp
- `user` - User information JSON
- `auth_provider` - Set to "keycloak"

## ⚙️ Keycloak Client Configuration

### 1. Create Keycloak Client

In your Keycloak admin console:

1. Create a new client with ID `scrumix-client`
2. Set **Valid redirect URIs**:
   ```
   http://localhost:8000/api/v1/auth/oauth/keycloak/callback
   ```
3. Set **Client authentication** to `On`
4. Set **Authorization** to `Off`
5. Set **Standard flow** to `Enabled`

## 🧪 Testing

### Manual Testing

1. Start your Keycloak server
2. Start the backend server (`http://localhost:8000`)
3. Start the frontend server (`http://localhost:3000`)
4. Go to `http://localhost:3000/auth/login`
5. Click "Sign in with Keycloak"
6. Complete authentication in Keycloak
7. You should be redirected to the workspace

## 📁 Key Files

### Frontend
- `frontend/src/app/auth/login/page.tsx` - Login page with Keycloak button
- `frontend/src/utils/auth.ts` - Authentication utilities

### Backend
- `backend/src/scrumix/api/routes/auth.py` - OAuth endpoints
- `backend/src/scrumix/api/utils/oauth.py` - Keycloak OAuth client
- `backend/src/scrumix/api/core/config.py` - Configuration settings

## 🛠️ Implementation Details

### Key Changes from Database Version

1. **No User Database Storage**: Users are not created or stored in the backend database
2. **Direct Token Usage**: Frontend uses Keycloak tokens directly for authentication
3. **Simplified Backend**: Minimal backend processing, just token exchange
4. **Frontend-Only Storage**: All user data stored in browser localStorage

### Authentication Flow

```javascript
// Frontend authentication check
import { isAuthenticated, getCurrentUser, getAccessToken } from '@/utils/auth';

if (isAuthenticated()) {
  const user = getCurrentUser();
  const token = getAccessToken();
  // User is logged in with Keycloak
}
```

### Making API Calls

```javascript
// Using the authentication utility
import { authenticatedFetch } from '@/utils/auth';

const response = await authenticatedFetch('/api/some-endpoint', {
  method: 'GET'
});
```

## 🔧 Troubleshooting

### Common Issues

1. **"Failed to initiate Keycloak login"**
   - Check backend is running and accessible
   - Verify NEXT_PUBLIC_API_URL is set correctly

2. **"Invalid state parameter"**
   - Clear browser localStorage
   - Check Keycloak client configuration

3. **"Failed to exchange code for tokens"**
   - Verify Keycloak client secret is correct
   - Check redirect URI matches exactly in Keycloak client settings

### Debug Tips

- Check browser console for error messages
- Check backend logs for OAuth errors
- Verify environment variables are loaded correctly
- Check Keycloak user has email address

## 🚀 Production Considerations

1. **Token Security**: Consider implementing token refresh mechanism
2. **Environment Variables**: Use secure environment variable management
3. **HTTPS**: Ensure all communications use HTTPS in production
4. **Session Management**: Implement proper session timeout handling
5. **User Data Sync**: Consider periodic sync with Keycloak for user updates

## ✨ Next Steps

1. **Implement token refresh** for better user experience
2. **Add role-based access control** using Keycloak roles
3. **Implement logout** with Keycloak session termination
4. **Add user profile management** with Keycloak integration 