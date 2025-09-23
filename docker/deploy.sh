#!/bin/bash

# ScrumiX Production Deployment Script
# Usage: ./deploy.sh [command]
# Commands: setup, start, stop, restart, logs, update, backup, restore

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yaml"
ENV_FILE=".env"
BACKUP_DIR="./backups"

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
    
    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env file not found. Please copy env.template to .env and configure it."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

setup_environment() {
    log_info "Setting up ScrumiX environment..."
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p $BACKUP_DIR
    mkdir -p ssl
    
    # Create Docker networks if they don't exist
    docker network create scrumix-network 2>/dev/null || true
    
    log_success "Environment setup completed"
}

start_services() {
    log_info "Starting ScrumiX services..."
    
    # Pull latest images
    docker-compose -f $COMPOSE_FILE pull
    
    # Start services
    docker-compose -f $COMPOSE_FILE up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Run database migrations
    log_info "Running database migrations..."
    docker-compose -f $COMPOSE_FILE exec backend python -m alembic upgrade head
    
    log_success "ScrumiX services started successfully"
    show_status
}

stop_services() {
    log_info "Stopping ScrumiX services..."
    docker-compose -f $COMPOSE_FILE down
    log_success "ScrumiX services stopped"
}

restart_services() {
    log_info "Restarting ScrumiX services..."
    stop_services
    start_services
}

show_logs() {
    local service=${2:-""}
    if [ -n "$service" ]; then
        docker-compose -f $COMPOSE_FILE logs -f $service
    else
        docker-compose -f $COMPOSE_FILE logs -f
    fi
}

show_status() {
    log_info "Service Status:"
    docker-compose -f $COMPOSE_FILE ps
    
    log_info "Health Checks:"
    echo "Frontend: http://localhost:3000"
    echo "Backend API: http://localhost:8000/health"
    echo "Keycloak: http://localhost:8080"
}

update_services() {
    log_info "Updating ScrumiX services..."
    
    # Backup database before update
    backup_database
    
    # Pull latest images
    docker-compose -f $COMPOSE_FILE pull
    
    # Restart services with new images
    docker-compose -f $COMPOSE_FILE up -d
    
    # Run any new migrations
    docker-compose -f $COMPOSE_FILE exec backend python -m alembic upgrade head
    
    log_success "ScrumiX services updated successfully"
}

backup_database() {
    log_info "Creating database backup..."
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/scrumix_backup_$timestamp.sql"
    
    # Create backup directory if it doesn't exist
    mkdir -p $BACKUP_DIR
    
    # Create database backup
    docker-compose -f $COMPOSE_FILE exec postgres pg_dump -U scrumix_user scrumix > $backup_file
    
    log_success "Database backup created: $backup_file"
}

restore_database() {
    local backup_file=$2
    
    if [ -z "$backup_file" ]; then
        log_error "Please specify backup file: ./deploy.sh restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_warning "This will overwrite the current database. Are you sure? (y/N)"
    read -r confirm
    if [[ $confirm != [yY] ]]; then
        log_info "Database restore cancelled"
        exit 0
    fi
    
    log_info "Restoring database from $backup_file..."
    
    # Stop backend service to prevent connections
    docker-compose -f $COMPOSE_FILE stop backend
    
    # Restore database
    docker-compose -f $COMPOSE_FILE exec -T postgres psql -U scrumix_user -d scrumix < $backup_file
    
    # Start backend service
    docker-compose -f $COMPOSE_FILE start backend
    
    log_success "Database restored successfully"
}

# Main script logic
case "${1:-help}" in
    setup)
        check_prerequisites
        setup_environment
        ;;
    start)
        check_prerequisites
        setup_environment
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs $@
        ;;
    status)
        show_status
        ;;
    update)
        check_prerequisites
        update_services
        ;;
    backup)
        backup_database
        ;;
    restore)
        restore_database $@
        ;;
    help|*)
        echo "ScrumiX Deployment Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  setup     - Set up environment and check prerequisites"
        echo "  start     - Start all ScrumiX services"
        echo "  stop      - Stop all ScrumiX services"
        echo "  restart   - Restart all ScrumiX services"
        echo "  logs      - Show logs for all services or specific service"
        echo "  status    - Show status of all services"
        echo "  update    - Update services to latest version"
        echo "  backup    - Create database backup"
        echo "  restore   - Restore database from backup"
        echo "  help      - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 start                    # Start all services"
        echo "  $0 logs backend             # Show backend logs"
        echo "  $0 restore backup_file.sql  # Restore from backup"
        ;;
esac
