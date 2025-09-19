# ScrumiX Docker Deployment Guide

This guide provides comprehensive instructions for deploying ScrumiX using Docker in both development and production environments.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM
- 20GB+ available disk space
- Git (for cloning the repository)

## Quick Start

### Development Environment

1. **Clone the repository and navigate to docker directory:**
   ```bash
   git clone https://github.com/MouYongli/ScrumiX.git
   cd ScrumiX/docker
   ```

2. **Start development environment:**
   ```bash
   docker-compose -f docker-compose.local.yaml up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Keycloak: http://localhost:8080
   - API Documentation: http://localhost:8000/docs

### Production Environment

1. **Clone the repository and navigate to docker directory:**
   ```bash
   git clone https://github.com/MouYongli/ScrumiX.git
   cd ScrumiX/docker
   ```

2. **Copy and configure environment file:**
   ```bash
   cp env.template .env
   # Edit .env with your production values
   ```

3. **Deploy ScrumiX:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh start
   ```

## Environment Configurations

### Development (docker-compose.local.yaml)

The local development setup includes:
- **PostgreSQL with pgvector**: Database with vector extension for AI features
- **FastAPI Backend**: Development server with hot reload
- **Keycloak**: Authentication server for OAuth2/OIDC
- **Source code mounting**: Live code changes without rebuilding

### Production (docker-compose.prod.yaml)

The production setup includes:
- **PostgreSQL**: Optimized database with SSL support
- **Redis**: Caching and session storage
- **FastAPI Backend**: Production-ready API server
- **Next.js Frontend**: Optimized React application
- **Keycloak**: Production authentication server
- **Nginx**: Reverse proxy with SSL termination

## Configuration

### Environment Variables

Copy `env.template` to `.env` and configure the following critical variables:

```bash
# Security (REQUIRED)
SECRET_KEY=your-super-secret-key-here
POSTGRES_PASSWORD=strong-database-password
KEYCLOAK_ADMIN_PASSWORD=strong-admin-password
KEYCLOAK_CLIENT_SECRET=keycloak-client-secret

# Domain Configuration
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
KEYCLOAK_HOSTNAME=auth.yourdomain.com

# Database Configuration
POSTGRES_USER=scrumix_user
POSTGRES_DB=scrumix
POSTGRES_PORT=5432

# Keycloak Configuration
KEYCLOAK_REALM=scrumix-app
KEYCLOAK_CLIENT_ID=scrumix-client
KEYCLOAK_DB_PASSWORD=keycloak-db-password
```

### SSL/TLS Setup

For production deployment with HTTPS:

1. **Place SSL certificates in the `ssl/` directory:**
   ```bash
   mkdir ssl
   cp your-cert.pem ssl/cert.pem
   cp your-key.pem ssl/key.pem
   ```

2. **Update nginx configuration:**
   - Uncomment the HTTPS server block in `nginx/conf.d/scrumix.conf`
   - Update server names with your domain

3. **Enable SSL in environment:**
   ```bash
   ENABLE_SSL=true
   ```

## Services Overview

### Development Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js development server |
| Backend | 8000 | FastAPI with hot reload |
| PostgreSQL | 5433 | Database with pgvector extension |
| Keycloak | 8080 | Authentication server |

### Production Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js production build |
| Backend | 8000 | FastAPI production server |
| PostgreSQL | 5432 | Primary database with pgvector |
| Keycloak | 8080 | Authentication service |
| Nginx | 80/443 | Reverse proxy |

## Deployment Commands

### Development Commands

```bash
# Start development environment
docker-compose -f docker-compose.local.yaml up -d

# Stop development environment
docker-compose -f docker-compose.local.yaml down

# View logs
docker-compose -f docker-compose.local.yaml logs -f

# Rebuild and restart
docker-compose -f docker-compose.local.yaml up -d --build
```

### Production Commands

```bash
# Start all services
./deploy.sh start

# Stop all services
./deploy.sh stop

# Restart all services
./deploy.sh restart

# View service status
./deploy.sh status

# View logs (all services)
./deploy.sh logs

# View logs (specific service)
./deploy.sh logs backend
```

### Maintenance Operations

```bash
# Update to latest version
./deploy.sh update

# Create database backup
./deploy.sh backup

# Restore from backup
./deploy.sh restore backups/scrumix_backup_20240101_120000.sql

# Setup environment
./deploy.sh setup
```

## Database Management

### PostgreSQL with pgvector

The production setup uses PostgreSQL with the pgvector extension for AI embeddings:

```bash
# Connect to database
docker-compose -f docker-compose.prod.yaml exec postgres psql -U scrumix_user -d scrumix

# Run migrations
docker-compose -f docker-compose.prod.yaml exec backend python -m alembic upgrade head

# Create backup
docker-compose -f docker-compose.prod.yaml exec postgres pg_dump -U scrumix_user scrumix > backup.sql
```

### PostgreSQL with pgvector

PostgreSQL with pgvector extension is used for AI embeddings and vector operations:

```bash
# Connect to database
docker-compose -f docker-compose.prod.yaml exec postgres psql -U scrumix_user -d scrumix

# Check pgvector extension
docker-compose -f docker-compose.prod.yaml exec postgres psql -U scrumix_user -d scrumix -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

## Monitoring and Health Checks

### Health Check Endpoints

- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:8000/health`
- **Keycloak:** `http://localhost:8080/health/ready`

### Logs

View real-time logs for debugging:

```bash
# All services
docker-compose -f docker-compose.prod.yaml logs -f

# Specific service
docker-compose -f docker-compose.prod.yaml logs -f backend

# Using deploy script
./deploy.sh logs backend
```

### Resource Monitoring

```bash
# Check resource usage
docker stats

# Check disk usage
docker system df

# Check service health
./deploy.sh status
```

## Security Considerations

### Required Security Updates

1. **Change all default passwords** in `.env`
2. **Generate strong SECRET_KEY**: `openssl rand -hex 32`
3. **Use HTTPS in production** with valid SSL certificates
4. **Configure firewall** to only allow necessary ports
5. **Regular backups** of database and configuration

### Network Security

- Services communicate via internal Docker network
- Only necessary ports are exposed to host
- Nginx reverse proxy handles all external traffic
- Rate limiting configured for API endpoints

### Keycloak Security

- Separate database for Keycloak
- Strong admin passwords required
- Client secrets must be generated securely
- SSL/TLS recommended for production

## Backup and Recovery

### Automated Backups

The deployment script includes backup functionality:

```bash
# Create manual backup
./deploy.sh backup

# Backups are stored in ./backups/ directory
# Format: scrumix_backup_YYYYMMDD_HHMMSS.sql
```

### Backup Schedule

Set up automated backups using cron:

```bash
# Add to crontab (daily backup at 2 AM)
0 2 * * * cd /path/to/docker && ./deploy.sh backup
```

### Recovery

```bash
# List available backups
ls -la backups/

# Restore from backup
./deploy.sh restore backups/scrumix_backup_20240101_020000.sql
```

## Scaling

### Horizontal Scaling

To scale services horizontally:

```bash
# Scale backend instances
docker-compose -f docker-compose.prod.yaml up -d --scale backend=3

# Scale frontend instances
docker-compose -f docker-compose.prod.yaml up -d --scale frontend=2
```

### Resource Limits

Add resource limits to `docker-compose.prod.yaml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Troubleshooting

### Common Issues

1. **Services fail to start:**
   ```bash
   # Check logs
   ./deploy.sh logs
   
   # Check environment variables
   docker-compose -f docker-compose.prod.yaml config
   ```

2. **Database connection errors:**
   ```bash
   # Check Postgres health
   docker-compose -f docker-compose.prod.yaml exec postgres pg_isready
   
   # Verify credentials in .env
   ```

3. **Migration errors:**
   ```bash
   # Run migrations manually
   docker-compose -f docker-compose.prod.yaml exec backend python -m alembic upgrade head
   ```

4. **Port conflicts:**
   ```bash
   # Check which process is using a port
   sudo netstat -tulpn | grep :8000
   
   # Change ports in .env file
   ```

5. **Keycloak setup issues:**
   ```bash
   # Check Keycloak logs
   ./deploy.sh logs keycloak
   
   # Verify Keycloak configuration
   docker-compose -f docker-compose.prod.yaml exec keycloak /opt/keycloak/bin/kc.sh show-config
   ```

### Performance Issues

1. **High memory usage:**
   ```bash
   # Check memory usage
   docker stats --no-stream
   
   # Restart services if needed
   ./deploy.sh restart
   ```

2. **Slow API responses:**
   ```bash
   # Check backend logs
   ./deploy.sh logs backend
   
   # Monitor database performance
   docker-compose -f docker-compose.prod.yaml exec postgres pg_stat_activity
   ```

## Updates and Maintenance

### Regular Maintenance Tasks

1. **Weekly:**
   - Check logs for errors
   - Verify backup creation
   - Monitor disk space

2. **Monthly:**
   - Update Docker images
   - Review security logs
   - Clean up old backups

3. **Quarterly:**
   - Security audit
   - Performance review
   - Disaster recovery test

### Update Procedure

```bash
# 1. Create backup
./deploy.sh backup

# 2. Update services
./deploy.sh update

# 3. Verify functionality
./deploy.sh status
```

## Development Workflow

### Local Development

1. **Start development environment:**
   ```bash
   docker-compose -f docker-compose.local.yaml up -d
   ```

2. **Make code changes** in the mounted source directories

3. **View logs** for debugging:
   ```bash
   docker-compose -f docker-compose.local.yaml logs -f backend
   ```

4. **Run tests** (if available):
   ```bash
   docker-compose -f docker-compose.local.yaml exec backend pytest
   ```

### Building for Production

1. **Build production images:**
   ```bash
   docker-compose -f docker-compose.prod.yaml build
   ```

2. **Test production setup locally:**
   ```bash
   docker-compose -f docker-compose.prod.yaml up -d
   ```

## File Structure

```
docker/
├── deploy.sh                    # Production deployment script
├── docker-compose.local.yaml    # Development compose file
├── docker-compose.prod.yaml     # Production compose file
├── env.template                 # Environment template
├── init-db.sh                   # Database initialization script
├── Makefile                     # Build commands
├── start-production.sh          # Production start script
├── start-production.bat         # Windows production start script
├── test-keycloak-setup.sh       # Keycloak test script
├── test-keycloak-setup.bat      # Windows Keycloak test script
├── nginx/                       # Nginx configuration
│   ├── nginx.conf
│   └── conf.d/
│       └── scrumix.conf
├── postgres/                    # PostgreSQL configuration
│   ├── dev-postgresql.conf
│   ├── prod-postgresql.conf
│   └── init/
│       ├── 01-enable-pgvector.sql
│       └── 02-create-keycloak-db.sql
├── keycloak/                    # Keycloak documentation
│   ├── README.md
│   └── SETUP_GUIDE.md
├── ssl/                         # SSL certificates (create manually)
│   └── README.md
├── backups/                     # Database backups
├── POSTGRESQL_DEPLOYMENT_GUIDE.md
└── README.md                    # This file
```

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review service logs for error messages
3. Consult the main project documentation
4. Check the Keycloak setup guide in `keycloak/SETUP_GUIDE.md`
5. Open an issue on the GitHub repository

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](../LICENSE) file for details.