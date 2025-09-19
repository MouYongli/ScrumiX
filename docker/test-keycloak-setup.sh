#!/bin/bash

# Test script for Keycloak integration setup
# Run this after completing the setup guide

echo "🔍 Testing ScrumiX Keycloak Integration Setup..."
echo

# Check if services are running
echo "📋 Checking service status..."
docker-compose -f docker-compose.local.yaml ps

echo
echo "🏥 Checking service health..."

# Check PostgreSQL
echo -n "PostgreSQL: "
if docker-compose -f docker-compose.local.yaml exec -T db pg_isready -U postgres -d scrumix_dev >/dev/null 2>&1; then
    echo "✅ Healthy"
else
    echo "❌ Not healthy"
fi

# Check if Keycloak database exists
echo -n "Keycloak DB: "
if docker-compose -f docker-compose.local.yaml exec -T db psql -U postgres -lqt | cut -d \| -f 1 | grep -qw keycloak; then
    echo "✅ Database exists"
else
    echo "❌ Database missing"
fi

# Check Keycloak health endpoint
echo -n "Keycloak: "
if curl -s http://localhost:8080/health/ready >/dev/null 2>&1; then
    echo "✅ Healthy"
else
    echo "❌ Not responding"
fi

# Check Backend
echo -n "Backend: "
if curl -s http://localhost:8000/docs >/dev/null 2>&1; then
    echo "✅ Responding"
else
    echo "❌ Not responding"
fi

echo
echo "🔗 Service URLs:"
echo "  - Keycloak Admin: http://localhost:8080/admin (admin/admin)"
echo "  - Backend API Docs: http://localhost:8000/docs"
echo "  - Backend Health: http://localhost:8000/health"

echo
echo "🧪 Testing OAuth endpoints..."

# Test Keycloak discovery endpoint
echo -n "Discovery endpoint: "
if curl -s "http://localhost:8080/realms/scrumix-app/.well-known/openid_configuration" | grep -q "authorization_endpoint"; then
    echo "✅ Working"
else
    echo "❌ Not working (realm may not exist yet)"
fi

# Test backend OAuth authorize endpoint
echo -n "Backend OAuth authorize: "
if curl -s "http://localhost:8000/api/v1/auth/oauth/keycloak/authorize" >/dev/null 2>&1; then
    echo "✅ Responding"
else
    echo "❌ Not responding"
fi

echo
echo "📝 Next steps:"
echo "  1. Open http://localhost:8080/admin and login with admin/admin"
echo "  2. Create realm 'scrumix-app'"
echo "  3. Create client 'scrumix-client'"
echo "  4. Update KEYCLOAK_CLIENT_SECRET in docker-compose.local.yaml"
echo "  5. Restart backend service"
echo "  6. Create test user and try authentication"

echo
echo "📚 See docker/keycloak/SETUP_GUIDE.md for detailed instructions"

