# Keycloak Setup Guide for ScrumiX Development

sThis guide walks you through setting up Keycloak for local development with ScrumiX.

## Prerequisites

- Docker and Docker Compose installed
- ScrumiX backend and database services running

## 1. Start the Services

```bash
cd docker
docker-compose -f docker-compose.local.yaml up -d
```

Wait for all services to be healthy. You can check the status with:
```bash
docker-compose -f docker-compose.local.yaml ps
```

## 2. Access Keycloak Admin Console

1. Open your browser and go to: http://localhost:8080/admin
2. Login with:
   - Username: `admin`
   - Password: `admin`

## 3. Create the ScrumiX Realm

1. In the Keycloak admin console, click on the dropdown next to "Master" (top left)
2. Click "Create Realm"
3. Enter the following details:
   - Realm name: `scrumix-app`
   - Enabled: `ON`
4. Click "Create"

## 4. Create the Backend Client (Confidential)

1. Make sure you're in the `scrumix-app` realm
2. In the left sidebar, click "Clients"
3. Click "Create client"
4. Fill in the details:
   - Client type: `OpenID Connect`
   - Client ID: `scrumix-client`
   - Name: `ScrumiX Backend Client`
   - Description: `Backend client for ScrumiX authentication`
5. Click "Next"
6. Configure the client:
   - Client authentication: `ON` (makes it confidential)
   - Authorization: `OFF`
   - Authentication flow:
     - Standard flow: `ON`
     - Direct access grants: `ON` (for testing)
     - Implicit flow: `OFF`
     - Service accounts roles: `OFF`
7. Click "Next"
8. Configure login settings:
   - Root URL: `http://localhost:3000`
   - Home URL: `http://localhost:3000`
   - Valid redirect URIs: 
     - `http://localhost:8000/api/v1/auth/oauth/keycloak/callback`
     - `http://localhost:3000/auth/callback`
   - Valid post logout redirect URIs: `http://localhost:3000`
   - Web origins: `http://localhost:3000`
9. Click "Save"

## 5. Get the Client Secret

1. In the client you just created, go to the "Credentials" tab
2. Copy the "Client secret" value
3. Update your docker-compose.local.yaml file:
   - Replace the empty `KEYCLOAK_CLIENT_SECRET: ""` with the actual secret
   - Example: `KEYCLOAK_CLIENT_SECRET: "your-client-secret-here"`
4. Restart the backend service:
   ```bash
   docker-compose -f docker-compose.local.yaml restart backend
   ```

## 6. Create a Test User

1. In the left sidebar, click "Users"
2. Click "Add user"
3. Fill in the details:
   - Username: `testuser`
   - Email: `test@scrumix.ai`
   - First name: `Test`
   - Last name: `User`
   - Email verified: `ON`
   - Enabled: `ON`
4. Click "Create"
5. Go to the "Credentials" tab
6. Click "Set password"
7. Enter:
   - Password: `testpassword`
   - Password confirmation: `testpassword`
   - Temporary: `OFF`
8. Click "Save"

## 7. Test the Integration

### Backend API Test (Optional)

You can test the OAuth flow using curl:

```bash
# Get authorization URL
curl -X GET "http://localhost:8000/api/v1/auth/oauth/keycloak/authorize"

# This will return a redirect URL - copy it and open in your browser
# Complete the login flow, then you'll be redirected back to your callback
```

### Frontend Integration

If you have a frontend, you can now:
1. Redirect users to the Keycloak login page
2. Handle the callback with the authorization code
3. Exchange the code for tokens via your backend API

## 8. Verify Database Integration

After a successful login, check your database:

```sql
-- Connect to your ScrumiX database
SELECT * FROM users WHERE email = 'test@scrumix.ai';
SELECT * FROM user_oauth WHERE provider = 'keycloak';
```

You should see:
- A new user record in the `users` table
- A corresponding OAuth link in the `user_oauth` table with `provider='keycloak'`

## Troubleshooting

### Common Issues

1. **Keycloak not accessible**: Check if the container is running and healthy
2. **Database connection errors**: Verify the Keycloak database was created properly
3. **Client secret not working**: Make sure you copied the correct secret and restarted the backend
4. **Redirect URI mismatch**: Ensure the redirect URIs in Keycloak match exactly what your app uses

### Logs

Check service logs:
```bash
# Keycloak logs
docker-compose -f docker-compose.local.yaml logs keycloak

# Backend logs
docker-compose -f docker-compose.local.yaml logs backend

# Database logs
docker-compose -f docker-compose.local.yaml logs db
```

## Configuration Summary

After setup, your configuration should be:

- **Keycloak Admin Console**: http://localhost:8080/admin (admin/admin)
- **Realm**: `scrumix-app`
- **Client ID**: `scrumix-client`
- **Client Type**: Confidential
- **Backend Callback**: `http://localhost:8000/api/v1/auth/oauth/keycloak/callback`
- **Frontend URL**: `http://localhost:3000`
- **Test User**: testuser / testpassword

## Next Steps

1. Integrate with your frontend application
2. Implement proper error handling
3. Add user role management if needed
4. Configure production settings for deployment

