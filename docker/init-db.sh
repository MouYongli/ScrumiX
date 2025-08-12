#!/bin/bash

# Database initialization script for production
# This script runs database migrations on container startup

set -e

echo "Waiting for database to be ready..."
while ! pg_isready -h postgres -p 5432 -U ${POSTGRES_USER:-scrumix_user} -d ${POSTGRES_DB:-scrumix}; do
    echo "Database not ready, waiting..."
    sleep 2
done

echo "Database is ready, running migrations..."
python -m alembic upgrade head

echo "Database initialization completed successfully!"
