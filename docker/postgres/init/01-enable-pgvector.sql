-- Enable pgvector extension for ScrumiX
CREATE EXTENSION IF NOT EXISTS vector;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE scrumix_dev TO postgres;
