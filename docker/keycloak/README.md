# ScrumiX Keycloak Integration

This directory contains the Keycloak integration for ScrumiX, providing OAuth2/OpenID Connect authentication.

## Quick Start

1. **Start the services**:
   ```bash
   cd docker
   docker-compose -f docker-compose.local.yaml up -d
   ```

2. **Follow the setup guide**: See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed configuration steps.

3. **Test the setup**:
   ```bash
   # On Windows
   docker/test-keycloak-setup.bat
   
   # On Linux/Mac
   docker/test-keycloak-setup.sh
   ```

## Architecture

- **Database Separation**: Keycloak uses its own PostgreSQL database (`keycloak`) while your app uses `scrumix_dev`
- **Network**: All services communicate via the `scrumix-local` Docker network
- **Authentication Flow**: Standard OAuth2 Authorization Code flow with PKCE support

## Configuration

### Docker Services

- **Keycloak**: Runs on port 8080, connects to PostgreSQL
- **PostgreSQL**: Shared server with separate databases for app and Keycloak
- **Backend**: FastAPI with Keycloak OAuth2 integration

### Environment Variables

The backend service uses these Keycloak-related environment variables:

```yaml
KEYCLOAK_SERVER_URL: http://keycloak:8080
KEYCLOAK_REALM: scrumix-app
KEYCLOAK_CLIENT_ID: scrumix-client
KEYCLOAK_CLIENT_SECRET: ""  # Set after client creation
KEYCLOAK_REDIRECT_URI: http://localhost:3000/auth/callback
```

## User Linking Strategy

When a user authenticates via Keycloak:

1. **Existing User**: If a `user_oauth` record exists with `provider='keycloak'` and matching `provider_user_id`, the user is logged in
2. **New User**: A new `users` record is created along with a `user_oauth` link record

## Database Schema

The integration uses existing tables:

- `users`: Main user profiles
- `user_oauth`: Links external OAuth accounts to local users
  - `provider`: Set to `'keycloak'`
  - `provider_user_id`: Keycloak user's `sub` claim
  - `access_token`: Keycloak access token (optional)
  - `refresh_token`: Keycloak refresh token (optional)

## API Endpoints

- `GET /api/v1/auth/oauth/keycloak/authorize`: Initiate OAuth flow
- `POST /api/v1/auth/oauth/keycloak/callback`: Handle OAuth callback
- `POST /api/v1/auth/oauth/keycloak/refresh`: Refresh tokens

## Testing

### Manual Testing

1. Visit: http://localhost:8000/api/v1/auth/oauth/keycloak/authorize
2. Complete login in Keycloak
3. Verify user creation in database

### Automated Testing

The test scripts check:
- Service health and connectivity
- Database setup
- OAuth endpoint availability
- Keycloak realm configuration

## Troubleshooting

### Common Issues

1. **Services not starting**: Check Docker logs and ensure ports are available
2. **Database connection errors**: Verify PostgreSQL init scripts ran correctly
3. **OAuth flow failures**: Ensure client configuration matches environment variables
4. **Token validation errors**: Check client secret and realm configuration

### Useful Commands

```bash
# Check service status
docker-compose -f docker-compose.local.yaml ps

# View logs
docker-compose -f docker-compose.local.yaml logs keycloak
docker-compose -f docker-compose.local.yaml logs backend

# Connect to database
docker-compose -f docker-compose.local.yaml exec db psql -U postgres -d scrumix_dev

# Check Keycloak health
curl http://localhost:8080/health/ready
```

## Security Considerations

- **Development Only**: Current setup is for development with relaxed security settings
- **Client Secret**: Store securely and rotate regularly in production
- **HTTPS**: Enable HTTPS for production deployments
- **Token Storage**: Consider token encryption for sensitive environments

## Next Steps

1. **Frontend Integration**: Implement OAuth flow in your frontend application
2. **Role Management**: Configure Keycloak roles and map to application permissions
3. **Production Setup**: Harden configuration for production deployment
4. **Multi-Realm Support**: Extend for multiple client realms if needed

## Files

- `SETUP_GUIDE.md`: Detailed setup instructions
- `../docker-compose.local.yaml`: Docker Compose configuration
- `../postgres/init/02-create-keycloak-db.sql`: Database initialization
- `../test-keycloak-setup.*`: Setup verification scripts
