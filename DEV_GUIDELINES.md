# ScrumiX Development Guidelines

## Project Overview

ScrumiX is a containerized application with several main components:
- **Backend API (Python/FastAPI)**
- **Frontend Web Application (Node.js/Next.js)**
- **SQL Database: PostgreSQL**
- **Keycloak: OAuth2 Authentication**
- **Vector Database: Weaviate**
<!-- - **Object Storage: MinIO**
- **Graph Database: Neo4j**
- **Cache: Redis**
- **Message Queue: RabbitMQ** -->

## Development Environment Setup

### Prerequisites
- Docker and Docker Compose
- Git
- Conda
   - Python 3.10 (for local development)
- Node.js 23.8.0 (for web development)
   - Next.js 15.3.1 (Router App)
   - React 19.0.0

### Local Development Setup
1. Clone the repository:
   ```
   git clone <repository-url>
   cd ScrumiX
   ```

2. Set up databases and services
   ```
   cd docker
   cp docker/postgres/.env.example docker/postgres/.env
   cp docker/weavate/.env.example docker/weaviate/.env
   cp docker/minio/.env.example docker/minio/.env
   # Neo4j, Redis and RabbitMQ do not require .env files by default
   docker compose -f docker-compose.local.yml up -d
   ```
   - Edit `docker/xxx/.env` as needed for your local development

3. Set up backend environment
   ```
   conda create --name scrumix python=3.10
   conda activate scrumix
   cd ../backend
   pip install -e .
   uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. Set up frontend environment
   ```
   cd ../web
   npm install
   npm run dev
   ```

### Docker Development Setup

### Container Structure
- `aigentflow-api`: Backend service
- `aigentflow-web`: Frontend service
- `aigentflow-postgres`: PostgreSQL database
- `aigentflow-weaviate`: Weaviate database
- `aigentflow-minio`: MinIO database
- `aigentflow-neo4j`: Neo4j database
- `aigentflow-redis`: Redis cache
- `aigentflow-rabbitmq`: RabbitMQ message queue

### Hot Reloading Development
The development environment is configured for hot reloading:
- Backend code in `backend/src` is volume-mounted, changes are reflected without rebuilding
- Frontend code in `frontend/app` is also volume-mounted for hot reloading

### Making Changes Without Rebuilding
1. **Backend API Changes**:
   - Edit files in `backend/src/` directory
   - Changes are automatically detected
   - If needed, restart the service: `docker compose restart frontend`

2. **Adding New Dependencies**:
   - Update `backend/pyproject.toml`
   - Apply changes without rebuilding:
     ```
     docker compose exec backend conda env update -f environment.yml
     # or
     docker compose exec backend pip install -e .
     ```

3. **Environment Variable Changes**:
   - Update `docker-compose.yml` 
   - Apply changes: `docker compose up -d --no-build backend`

4. **Clean Up Docker Compose**
   ```
   # Only remove containers, networks, and volumes
   docker compose down --volumes --remove-orphans
   # If you also want to remove all images built by this compose file, add --rmi all
   docker compose down --volumes --remove-orphans --rmi all
   ```

## Troubleshooting

Common issues:
   - API service not running properly
   - Dependencies not installed correctly
   - Database connection issues
   - Port conflicts

### Fixing Common Issues
1. **API Service Issues**:
   - Check logs for errors
   - Restart the service: `docker compose restart backend`
   - Verify dependencies are installed: `docker exec -it backend conda run -n scrumix pip install -e .`

2. **Database Issues**:
   - Check database logs: `docker logs backend`
   - Verify connection parameters in API service

3. **Port Conflicts**:
   - Check if ports are already in use: `lsof -i :8000` or `lsof -i :5432`
   - Modify port mappings in docker-compose.yml if needed

## Testing

1. Run backend tests:
   ```
   docker compose exec backend pytest
   ```

2. Check code formatting:
   ```
   docker compose exec backend black . --check
   ```

## Deployment

For production deployment:

1. Build optimized images:
   ```
   docker compose -f docker-compose.yml -f docker-compose.prod.yml build
   ```

2. Deploy:
   ```
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

## Contributing Guidelines

1. Create feature branches from main
2. Follow code style conventions
3. Include tests for new functionality
4. Submit pull requests with clear descriptions 
