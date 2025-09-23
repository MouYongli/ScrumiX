-- Create Keycloak database and user for ScrumiX integration
-- This script runs during PostgreSQL container initialization

-- Create keycloak user
CREATE USER keycloak WITH PASSWORD 'keycloak_password';

-- Create keycloak database
CREATE DATABASE keycloak OWNER keycloak;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;

-- Connect to keycloak database and grant schema permissions
\c keycloak;
GRANT ALL ON SCHEMA public TO keycloak;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO keycloak;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO keycloak;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO keycloak;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO keycloak;

