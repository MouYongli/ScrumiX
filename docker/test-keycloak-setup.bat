@echo off
REM Test script for Keycloak integration setup - Windows version
REM Run this after completing the setup guide

echo 🔍 Testing ScrumiX Keycloak Integration Setup...
echo.

REM Check if services are running
echo 📋 Checking service status...
docker-compose -f docker-compose.local.yaml ps

echo.
echo 🏥 Checking service health...

REM Check PostgreSQL
echo | set /p="PostgreSQL: "
docker-compose -f docker-compose.local.yaml exec -T db pg_isready -U postgres -d scrumix_dev >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Healthy
) else (
    echo ❌ Not healthy
)

REM Check if Keycloak database exists
echo | set /p="Keycloak DB: "
docker-compose -f docker-compose.local.yaml exec -T db psql -U postgres -lqt | findstr keycloak >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Database exists
) else (
    echo ❌ Database missing
)

REM Check Keycloak health endpoint
echo | set /p="Keycloak: "
curl -s http://localhost:8080/health/ready >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Healthy
) else (
    echo ❌ Not responding
)

REM Check Backend
echo | set /p="Backend: "
curl -s http://localhost:8000/docs >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Responding
) else (
    echo ❌ Not responding
)

echo.
echo 🔗 Service URLs:
echo   - Keycloak Admin: http://localhost:8080/admin (admin/admin)
echo   - Backend API Docs: http://localhost:8000/docs
echo   - Backend Health: http://localhost:8000/health

echo.
echo 🧪 Testing OAuth endpoints...

REM Test Keycloak discovery endpoint
echo | set /p="Discovery endpoint: "
curl -s "http://localhost:8080/realms/scrumix-app/.well-known/openid_configuration" | findstr "authorization_endpoint" >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Working
) else (
    echo ❌ Not working (realm may not exist yet)
)

REM Test backend OAuth authorize endpoint
echo | set /p="Backend OAuth authorize: "
curl -s "http://localhost:8000/api/v1/auth/oauth/keycloak/authorize" >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Responding
) else (
    echo ❌ Not responding
)

echo.
echo 📝 Next steps:
echo   1. Open http://localhost:8080/admin and login with admin/admin
echo   2. Create realm 'scrumix-app'
echo   3. Create client 'scrumix-client'
echo   4. Update KEYCLOAK_CLIENT_SECRET in docker-compose.local.yaml
echo   5. Restart backend service
echo   6. Create test user and try authentication

echo.
echo 📚 See docker/keycloak/SETUP_GUIDE.md for detailed instructions
pause

