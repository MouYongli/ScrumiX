# ScrumiX Docker Management (Simplified)
.PHONY: help dev dev-db test-connection clean

# Default target
help:
	@echo "ScrumiX Docker Management Commands (Simplified):"
	@echo ""
	@echo "Quick Start:"
	@echo "  make dev-db          - Start only PostgreSQL for development"
	@echo "  make test-connection - Test database connection"
	@echo "  make dev             - Start full development environment"
	@echo "  make restart-backend - Restart backend only"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean           - Remove all containers and volumes"
	@echo "  make logs            - Show container logs"
	@echo ""
	@echo "Windows Users:"
	@echo "  Use 'docker-compose -f docker-compose.local.yaml up db' manually"

# Start only PostgreSQL for development
dev-db:
	@echo "Starting PostgreSQL only..."
	docker-compose -f docker-compose.local.yaml up -d db
	@echo "PostgreSQL started!"
	@echo "Connection details:"
	@echo "   - Host: localhost"
	@echo "   - Port: 5433"
	@echo "   - Database: scrumix_dev"
	@echo "   - User: postgres"
	@echo "   - Password: scrumix"

# Start full development environment
dev:
	@echo "Starting full development environment..."
	docker-compose -f docker-compose.local.yaml up -d
	@echo "Development environment started!"

# Test database connection
test-connection:
	@echo "Testing database connection..."
	@echo "Testing PostgreSQL connection via curl..."
	curl -f http://localhost:8000/health || echo "Backend not responding"
	@echo "Testing direct PostgreSQL connection..."
	docker-compose -f docker-compose.local.yaml exec db pg_isready -U postgres

# Show logs
logs:
	docker-compose -f docker-compose.local.yaml logs -f

# Restart backend only
restart-backend:
	@echo "Restarting backend..."
	docker-compose -f docker-compose.local.yaml restart backend
	@echo "Backend restarted!"

# Stop everything
stop:
	docker-compose -f docker-compose.local.yaml down

# Clean up containers and volumes
clean:
	docker-compose -f docker-compose.local.yaml down -v --remove-orphans
	docker system prune -f
