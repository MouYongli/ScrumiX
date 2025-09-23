#!/bin/bash

# Railway startup script for ScrumiX backend
set -e

echo "Starting ScrumiX Backend..."

# Set default port if not provided
export PORT=${PORT:-8000}

# Print environment info
echo "Environment: ${ENVIRONMENT:-development}"
echo "Port: $PORT"
echo "Database URL: ${DATABASE_URL:0:20}..." # Only show first 20 chars for security

# Check if pgvector is available
python -c "
try:
    from pgvector.sqlalchemy import Vector
    print('pgvector extension is available')
except ImportError:
    print('pgvector extension not available - using fallback mode')
"

# Start the application
echo "Starting FastAPI application..."
exec python -m scrumix.main
