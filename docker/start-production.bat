@echo off
REM ScrumiX Production Deployment Script for Windows
REM This script helps deploy ScrumiX in production with proper checks

echo 🚀 ScrumiX Production Deployment
echo =================================

REM Check if .env file exists
if not exist ".env" (
    echo ❌ Error: .env file not found!
    echo 📋 Please copy env.template to .env and configure it:
    echo    copy env.template .env
    echo    notepad .env
    pause
    exit /b 1
)

echo 🔍 Environment file found...

REM Pull latest images
echo 📦 Pulling latest Docker images...
docker-compose -f docker-compose.prod.yaml pull

REM Start services
echo 🚀 Starting services...
docker-compose -f docker-compose.prod.yaml up -d

REM Wait for services to be healthy
echo ⏳ Waiting for services to be healthy...
timeout /t 30 /nobreak > nul

REM Check service health
echo 🏥 Checking service health...
docker-compose -f docker-compose.prod.yaml ps

echo.
echo 🎉 Deployment completed!
echo 📊 Check service status above
echo.
echo 📋 Next steps:
echo    1. Configure Keycloak realm and client (see keycloak\SETUP_GUIDE.md)
echo    2. Test the application  
echo    3. Set up monitoring and backups
echo.
echo 📖 View logs: docker-compose -f docker-compose.prod.yaml logs -f
echo 🛑 Stop services: docker-compose -f docker-compose.prod.yaml down
pause
