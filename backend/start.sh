#!/bin/bash

# Railway startup script for ScrumiX backend
echo "Starting ScrumiX Backend on Railway..."

# Set default environment if not set
export ENVIRONMENT=${ENVIRONMENT:-production}

# Print environment info
echo "Environment: $ENVIRONMENT"
echo "Port: $PORT"
echo "Database URL: ${DATABASE_URL:0:20}..." # Only show first 20 chars for security

# Start the application
exec python -m scrumix.main
