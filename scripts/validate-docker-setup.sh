#!/bin/bash

# ScrumiX Docker Setup Validation Script
# Validates that all Docker-related files are properly configured

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

ERRORS=0
WARNINGS=0

check_file_exists() {
    local file="$1"
    local description="$2"
    
    if [ -f "$file" ]; then
        log_success "$description exists: $file"
    else
        log_error "$description missing: $file"
        ERRORS=$((ERRORS + 1))
    fi
}

check_dockerfile() {
    local dockerfile="$1"
    local service="$2"
    
    log_info "Checking $service Dockerfile..."
    
    if [ ! -f "$dockerfile" ]; then
        log_error "$service Dockerfile missing: $dockerfile"
        ERRORS=$((ERRORS + 1))
        return
    fi
    
    # Check for required instructions
    local required_instructions=("FROM" "WORKDIR" "COPY" "RUN" "EXPOSE" "CMD")
    
    for instruction in "${required_instructions[@]}"; do
        if grep -q "^$instruction" "$dockerfile"; then
            log_success "$service Dockerfile has $instruction instruction"
        else
            log_warning "$service Dockerfile missing $instruction instruction"
            WARNINGS=$((WARNINGS + 1))
        fi
    done
    
    # Check for health check
    if grep -q "HEALTHCHECK" "$dockerfile"; then
        log_success "$service Dockerfile has health check"
    else
        log_warning "$service Dockerfile missing health check"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # Check for .dockerignore
    local dockerignore_file="$(dirname "$dockerfile")/.dockerignore"
    if [ -f "$dockerignore_file" ]; then
        log_success "$service has .dockerignore file"
    else
        log_warning "$service missing .dockerignore file"
        WARNINGS=$((WARNINGS + 1))
    fi
}

check_compose_file() {
    local compose_file="$1"
    local environment="$2"
    
    log_info "Checking $environment docker-compose file..."
    
    if [ ! -f "$compose_file" ]; then
        log_error "$environment docker-compose file missing: $compose_file"
        ERRORS=$((ERRORS + 1))
        return
    fi
    
    # Check for required services
    local required_services=("postgres")
    
    for service in "${required_services[@]}"; do
        if grep -q "^  $service:" "$compose_file"; then
            log_success "$environment compose has $service service"
        else
            log_error "$environment compose missing $service service"
            ERRORS=$((ERRORS + 1))
        fi
    done
    
    # Check for volumes
    if grep -q "^volumes:" "$compose_file"; then
        log_success "$environment compose has volumes section"
    else
        log_warning "$environment compose missing volumes section"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # Check for networks
    if grep -q "^networks:" "$compose_file"; then
        log_success "$environment compose has networks section"
    else
        log_warning "$environment compose missing networks section"
        WARNINGS=$((WARNINGS + 1))
    fi
}

check_alembic_config() {
    log_info "Checking Alembic configuration..."
    
    # Check alembic.ini
    if [ -f "backend/alembic.ini" ]; then
        log_success "Alembic configuration file exists"
    else
        log_error "Alembic configuration file missing: backend/alembic.ini"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check env.py
    if [ -f "backend/alembic/env.py" ]; then
        log_success "Alembic env.py exists"
        
        # Check if env.py is properly configured
        if grep -q "from scrumix.api.core.config import settings" "backend/alembic/env.py"; then
            log_success "Alembic env.py imports settings"
        else
            log_error "Alembic env.py missing settings import"
            ERRORS=$((ERRORS + 1))
        fi
        
        if grep -q "from scrumix.api.db.base import Base" "backend/alembic/env.py"; then
            log_success "Alembic env.py imports Base"
        else
            log_error "Alembic env.py missing Base import"
            ERRORS=$((ERRORS + 1))
        fi
    else
        log_error "Alembic env.py missing: backend/alembic/env.py"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check versions directory
    if [ -d "backend/alembic/versions" ]; then
        log_success "Alembic versions directory exists"
        
        # Check if there are migration files
        if [ "$(ls -A backend/alembic/versions/*.py 2>/dev/null | wc -l)" -gt 0 ]; then
            log_success "Alembic has migration files"
        else
            log_warning "Alembic versions directory is empty"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        log_error "Alembic versions directory missing: backend/alembic/versions"
        ERRORS=$((ERRORS + 1))
    fi
}

check_next_config() {
    log_info "Checking Next.js configuration..."
    
    if [ -f "frontend/next.config.ts" ]; then
        log_success "Next.js config file exists"
        
        # Check for standalone output
        if grep -q "output.*standalone" "frontend/next.config.ts"; then
            log_success "Next.js configured for standalone output"
        else
            log_warning "Next.js not configured for standalone output (required for Docker)"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        log_error "Next.js config file missing: frontend/next.config.ts"
        ERRORS=$((ERRORS + 1))
    fi
}

check_environment_templates() {
    log_info "Checking environment templates..."
    
    # Check backend env template
    if [ -f "docker/env.template" ]; then
        log_success "Environment template exists"
        
        # Check for required variables
        local required_vars=("POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB" "SECRET_KEY")
        
        for var in "${required_vars[@]}"; do
            if grep -q "^$var=" "docker/env.template"; then
                log_success "Environment template has $var"
            else
                log_error "Environment template missing $var"
                ERRORS=$((ERRORS + 1))
            fi
        done
    else
        log_error "Environment template missing: docker/env.template"
        ERRORS=$((ERRORS + 1))
    fi
}

check_scripts() {
    log_info "Checking deployment scripts..."
    
    # Check deployment script
    if [ -f "docker/deploy.sh" ]; then
        log_success "Deployment script exists"
        
        # Check if executable
        if [ -x "docker/deploy.sh" ]; then
            log_success "Deployment script is executable"
        else
            log_warning "Deployment script not executable (run: chmod +x docker/deploy.sh)"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        log_error "Deployment script missing: docker/deploy.sh"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check local testing scripts
    if [ -f "scripts/test-local-docker.sh" ]; then
        log_success "Local testing script exists"
    else
        log_warning "Local testing script missing: scripts/test-local-docker.sh"
        WARNINGS=$((WARNINGS + 1))
    fi
}

main() {
    log_info "Starting ScrumiX Docker setup validation..."
    echo
    
    # Check Dockerfiles
    check_dockerfile "backend/Dockerfile" "Backend"
    check_dockerfile "frontend/Dockerfile" "Frontend"
    echo
    
    # Check docker-compose files
    check_compose_file "docker/docker-compose.local.yaml" "Local"
    check_compose_file "docker/docker-compose.prod.yaml" "Production"
    echo
    
    # Check Alembic configuration
    check_alembic_config
    echo
    
    # Check Next.js configuration
    check_next_config
    echo
    
    # Check environment templates
    check_environment_templates
    echo
    
    # Check scripts
    check_scripts
    echo
    
    # Check nginx configuration
    log_info "Checking Nginx configuration..."
    check_file_exists "docker/nginx/nginx.conf" "Nginx main config"
    check_file_exists "docker/nginx/conf.d/scrumix.conf" "Nginx site config"
    echo
    
    # Check documentation
    log_info "Checking documentation..."
    check_file_exists "docker/README.md" "Docker deployment guide"
    echo
    
    # Summary
    log_info "Validation Summary:"
    if [ $ERRORS -eq 0 ]; then
        log_success "No critical errors found!"
    else
        log_error "Found $ERRORS critical error(s) that must be fixed"
    fi
    
    if [ $WARNINGS -eq 0 ]; then
        log_success "No warnings found!"
    else
        log_warning "Found $WARNINGS warning(s) that should be addressed"
    fi
    
    echo
    if [ $ERRORS -eq 0 ]; then
        log_success "Docker setup validation PASSED!"
        log_info "You can proceed with local testing using:"
        echo "  ./scripts/test-local-docker.sh"
        echo "Or for Windows:"
        echo "  .\\scripts\\test-local-docker.ps1"
        exit 0
    else
        log_error "Docker setup validation FAILED!"
        log_info "Please fix the critical errors and run validation again."
        exit 1
    fi
}

main "$@"
