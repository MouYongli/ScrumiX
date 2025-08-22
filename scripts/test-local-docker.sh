#!/bin/bash

# ScrumiX Local Docker Testing Script
# This script helps test the Docker setup locally before deploying

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
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

# Configuration
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
DOCKER_DIR="docker"

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Please run this script from the ScrumiX project root directory."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

setup_local_env() {
    log_info "Setting up local environment..."
    
    # Create backend .env if it doesn't exist
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        log_warning "Creating backend/.env file..."
        cat > "$BACKEND_DIR/.env" << EOF
# Database
POSTGRES_USER=admin
POSTGRES_PASSWORD=postgres
POSTGRES_DB=scrumix
POSTGRES_SERVER=localhost
POSTGRES_PORT=5433

# App
SECRET_KEY=local-development-secret-key-change-in-production
ENVIRONMENT=development

# URLs
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
EOF
        log_success "Created $BACKEND_DIR/.env"
    fi
    
    # Create frontend .env.local if it doesn't exist
    if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
        log_warning "Creating frontend/.env.local file..."
        cat > "$FRONTEND_DIR/.env.local" << EOF
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NODE_ENV=development
EOF
        log_success "Created $FRONTEND_DIR/.env.local"
    fi
    
    log_success "Environment setup completed"
}

start_database() {
    log_info "Starting PostgreSQL database..."
    
    # Start only PostgreSQL using local compose
    cd $DOCKER_DIR
    docker-compose -f docker-compose.local.yaml up -d scrumix-postgres
    cd ..
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 10
    
    # Check if database is ready
    if docker exec docker-scrumix-postgres-1 pg_isready -U admin -d scrumix >/dev/null 2>&1; then
        log_success "Database is ready"
    else
        log_error "Database failed to start properly"
        exit 1
    fi
}

test_backend() {
    log_info "Testing backend..."
    
    cd $BACKEND_DIR
    
    # Run database migrations
    log_info "Running database migrations..."
    if python -m alembic upgrade head; then
        log_success "Database migrations completed"
    else
        log_error "Database migrations failed"
        cd ..
        return 1
    fi
    
    # Start backend in background
    log_info "Starting backend server..."
    uvicorn scrumix.api.app:app --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    
    # Wait for backend to start
    sleep 5
    
    # Test backend health endpoint
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        log_success "Backend health check passed"
        
        # Test API endpoints
        log_info "Testing API endpoints..."
        
        # Test projects endpoint (should return empty list initially)
        if curl -f http://localhost:8000/api/v1/projects >/dev/null 2>&1; then
            log_success "Projects API endpoint working"
        else
            log_warning "Projects API endpoint not accessible (might need authentication)"
        fi
        
        # Kill backend process
        kill $BACKEND_PID 2>/dev/null || true
        cd ..
        return 0
    else
        log_error "Backend health check failed"
        kill $BACKEND_PID 2>/dev/null || true
        cd ..
        return 1
    fi
}

test_frontend() {
    log_info "Testing frontend..."
    
    cd $FRONTEND_DIR
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing frontend dependencies..."
        npm install
    fi
    
    # Build frontend
    log_info "Building frontend..."
    if npm run build; then
        log_success "Frontend build successful"
        
        # Start frontend in background
        log_info "Starting frontend server..."
        npm start &
        FRONTEND_PID=$!
        
        # Wait for frontend to start
        sleep 10
        
        # Test frontend
        if curl -f http://localhost:3000 >/dev/null 2>&1; then
            log_success "Frontend is accessible"
            kill $FRONTEND_PID 2>/dev/null || true
            cd ..
            return 0
        else
            log_error "Frontend is not accessible"
            kill $FRONTEND_PID 2>/dev/null || true
            cd ..
            return 1
        fi
    else
        log_error "Frontend build failed"
        cd ..
        return 1
    fi
}

test_docker_build() {
    log_info "Testing Docker builds..."
    
    # Test backend Docker build
    log_info "Building backend Docker image..."
    if docker build -t scrumix-backend:test $BACKEND_DIR; then
        log_success "Backend Docker build successful"
    else
        log_error "Backend Docker build failed"
        return 1
    fi
    
    # Test frontend Docker build
    log_info "Building frontend Docker image..."
    if docker build -t scrumix-frontend:test $FRONTEND_DIR; then
        log_success "Frontend Docker build successful"
    else
        log_error "Frontend Docker build failed"
        return 1
    fi
    
    # Clean up test images
    docker rmi scrumix-backend:test scrumix-frontend:test >/dev/null 2>&1 || true
    
    log_success "Docker builds completed successfully"
}

cleanup() {
    log_info "Cleaning up..."
    
    # Stop any running processes
    pkill -f "uvicorn scrumix.api.app:app" 2>/dev/null || true
    pkill -f "npm start" 2>/dev/null || true
    
    # Stop database
    cd $DOCKER_DIR
    docker-compose -f docker-compose.local.yaml down >/dev/null 2>&1 || true
    cd ..
    
    log_success "Cleanup completed"
}

# Main script
case "${1:-full}" in
    prereq)
        check_prerequisites
        ;;
    env)
        check_prerequisites
        setup_local_env
        ;;
    db)
        check_prerequisites
        setup_local_env
        start_database
        ;;
    backend)
        check_prerequisites
        setup_local_env
        start_database
        test_backend
        ;;
    frontend)
        check_prerequisites
        setup_local_env
        test_frontend
        ;;
    docker)
        check_prerequisites
        test_docker_build
        ;;
    full)
        log_info "Running full local Docker test..."
        check_prerequisites
        setup_local_env
        start_database
        
        if test_backend; then
            log_success "Backend test passed"
        else
            log_error "Backend test failed"
            cleanup
            exit 1
        fi
        
        if test_frontend; then
            log_success "Frontend test passed"
        else
            log_error "Frontend test failed"
            cleanup
            exit 1
        fi
        
        if test_docker_build; then
            log_success "Docker build tests passed"
        else
            log_error "Docker build tests failed"
            cleanup
            exit 1
        fi
        
        cleanup
        log_success "All tests passed! Docker setup is ready."
        ;;
    cleanup)
        cleanup
        ;;
    help|*)
        echo "ScrumiX Local Docker Testing Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  prereq    - Check prerequisites only"
        echo "  env       - Set up environment files"
        echo "  db        - Start database and test connection"
        echo "  backend   - Test backend functionality"
        echo "  frontend  - Test frontend functionality"
        echo "  docker    - Test Docker builds"
        echo "  full      - Run all tests (default)"
        echo "  cleanup   - Clean up running processes"
        echo "  help      - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0              # Run full test suite"
        echo "  $0 backend      # Test only backend"
        echo "  $0 docker       # Test only Docker builds"
        ;;
esac
