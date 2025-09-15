#!/bin/bash

# ScrumiX Production Startup Script
# This script helps deploy ScrumiX in production with proper checks

set -e

echo "🚀 ScrumiX Production Deployment"
echo "================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "📋 Please copy env.template to .env and configure it:"
    echo "   cp env.template .env"
    echo "   nano .env"
    exit 1
fi

# Source environment variables
source .env

# Check required environment variables
REQUIRED_VARS=(
    "POSTGRES_PASSWORD"
    "SECRET_KEY"
    "KEYCLOAK_CLIENT_SECRET"
    "KEYCLOAK_ADMIN_PASSWORD"
    "REDIS_PASSWORD"
)

echo "🔍 Checking environment variables..."
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [[ "${!var}" == *"CHANGE_ME"* ]]; then
        echo "❌ Error: $var is not set or contains CHANGE_ME"
        echo "📝 Please update your .env file with proper values"
        exit 1
    fi
done
echo "✅ Environment variables OK"

# Check SSL certificates if HTTPS is enabled
if [ "${ENABLE_SSL:-false}" = "true" ]; then
    echo "🔒 Checking SSL certificates..."
    if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
        echo "❌ Error: SSL certificates not found!"
        echo "📋 Please place your SSL certificates in the ssl/ directory:"
        echo "   - ssl/cert.pem (certificate)"
        echo "   - ssl/key.pem (private key)"
        exit 1
    fi
    echo "✅ SSL certificates found"
fi

# Test Nginx configuration
echo "🔧 Testing Nginx configuration..."
docker run --rm --network none \
    -v "$(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
    -v "$(pwd)/nginx/test-config.conf:/etc/nginx/conf.d/default.conf:ro" \
    nginx:alpine nginx -t > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Error: Nginx configuration test failed!"
    echo "🔧 Please check your nginx configuration files"
    exit 1
fi

# Pull latest images
echo "📦 Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yaml pull

# Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yaml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
SERVICES=("postgres" "redis" "backend" "frontend" "nginx")

if [ "${KEYCLOAK_SERVER_URL}" = "http://keycloak:8080" ]; then
    SERVICES+=("keycloak")
fi

for service in "${SERVICES[@]}"; do
    if docker-compose -f docker-compose.prod.yaml ps | grep -q "$service.*healthy\|$service.*Up"; then
        echo "✅ $service is running"
    else
        echo "⚠️  $service status unclear, checking logs..."
        docker-compose -f docker-compose.prod.yaml logs --tail=10 $service
    fi
done

echo ""
echo "🎉 Deployment completed!"
echo "📊 Service URLs:"
echo "   Frontend: ${FRONTEND_URL:-http://localhost:3000}"
echo "   Backend:  ${BACKEND_URL:-http://localhost:8000}"

if [ "${KEYCLOAK_SERVER_URL}" = "http://keycloak:8080" ]; then
    echo "   Keycloak: ${KEYCLOAK_PUBLIC_URL:-http://localhost:8080}"
fi

echo ""
echo "📋 Next steps:"
echo "   1. Configure Keycloak realm and client (see keycloak/SETUP_GUIDE.md)"
echo "   2. Test the application"
echo "   3. Set up monitoring and backups"
echo ""
echo "📖 View logs: docker-compose -f docker-compose.prod.yaml logs -f"
echo "🛑 Stop services: docker-compose -f docker-compose.prod.yaml down"
