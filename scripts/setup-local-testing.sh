#!/bin/bash

# ScrumiX Local Testing Setup Script
# This script sets up the complete stack for local development and testing

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the project root
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    log_error "Please run this script from the ScrumiX project root directory"
    exit 1
fi

log_info "Setting up ScrumiX for local testing..."

# 1. Set up backend environment
log_info "Setting up backend environment..."
cd backend

if [ ! -f ".env" ]; then
    log_info "Creating backend .env file..."
    cat > .env << EOF
# Database
POSTGRES_USER=admin
POSTGRES_PASSWORD=postgres
POSTGRES_DB=scrumix
POSTGRES_SERVER=localhost
POSTGRES_PORT=5433

# App
SECRET_KEY=local-development-key-change-in-production
ENVIRONMENT=development

# URLs
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Keycloak (optional for basic testing)
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=scrumix-app
KEYCLOAK_CLIENT_ID=scrumix-client
KEYCLOAK_CLIENT_SECRET=your-client-secret-here
EOF
    log_success "Backend .env created"
else
    log_info "Backend .env already exists"
fi

cd ..

# 2. Set up frontend environment
log_info "Setting up frontend environment..."
cd frontend

if [ ! -f ".env.local" ]; then
    log_info "Creating frontend .env.local file..."
    cat > .env.local << EOF
# Backend API URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1

# Development mode
NODE_ENV=development
EOF
    log_success "Frontend .env.local created"
else
    log_info "Frontend .env.local already exists"
fi

cd ..

# 3. Start database
log_info "Starting PostgreSQL database..."
cd docker
docker-compose -f docker-compose.local.yaml up -d scrumix-postgres

# Wait for database to be ready
log_info "Waiting for database to be ready..."
sleep 10

# Check if database is ready
if docker exec docker-scrumix-postgres-1 pg_isready -U admin -d scrumix > /dev/null 2>&1; then
    log_success "Database is ready"
else
    log_warning "Database might not be ready yet. You may need to wait a bit longer."
fi

cd ..

# 4. Run database migrations
log_info "Running database migrations..."
cd backend

# Check if alembic is working
if python -c "import alembic" > /dev/null 2>&1; then
    log_info "Running Alembic migrations..."
    if python -m alembic upgrade head; then
        log_success "Database migrations completed"
    else
        log_warning "Migration failed. You may need to run it manually later."
    fi
else
    log_warning "Alembic not available. Install dependencies with: pip install -e ."
fi

cd ..

# 5. Create test script
log_info "Creating test verification script..."
cat > test-local-setup.sh << 'EOF'
#!/bin/bash

# Test script to verify local setup

echo "🧪 Testing ScrumiX Local Setup..."

# Test database connection
echo "📋 Testing database connection..."
if docker exec docker-scrumix-postgres-1 psql -U admin -d scrumix -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection: OK"
else
    echo "❌ Database connection: FAILED"
fi

# Test backend health (if running)
echo "📋 Testing backend health..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend health: OK"
else
    echo "⚠️  Backend not running or not healthy"
    echo "   Start with: cd backend && uvicorn scrumix.api.app:app --reload"
fi

# Test frontend (if running)
echo "📋 Testing frontend..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend: OK"
else
    echo "⚠️  Frontend not running"
    echo "   Start with: cd frontend && npm run dev"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Start backend: cd backend && uvicorn scrumix.api.app:app --reload"
echo "2. Start frontend: cd frontend && npm run dev"
echo "3. Open browser: http://localhost:3000"
echo "4. Test creating projects, tasks, etc."
EOF

chmod +x test-local-setup.sh

log_success "Setup completed!"
echo ""
echo "🎯 Next steps:"
echo "1. Start the backend:"
echo "   cd backend"
echo "   uvicorn scrumix.api.app:app --reload"
echo ""
echo "2. In another terminal, start the frontend:"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "3. Open your browser to: http://localhost:3000"
echo ""
echo "4. Run verification test:"
echo "   ./test-local-setup.sh"
echo ""
log_info "Happy testing! 🚀"
