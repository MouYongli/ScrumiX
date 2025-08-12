# ScrumiX Docker Deployment Guide

This guide provides instructions for deploying ScrumiX using Docker in a production environment.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM
- 20GB+ available disk space

## Quick Start

1. **Clone the repository and navigate to docker directory:**
   ```bash
   cd docker
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

## Configuration

### Environment Variables

Copy `env.template` to `.env` and configure the following critical variables:

```bash
# Security (REQUIRED)
SECRET_KEY=your-super-secret-key-here
POSTGRES_PASSWORD=strong-database-password
REDIS_PASSWORD=strong-redis-password
KEYCLOAK_ADMIN_PASSWORD=strong-admin-password
KEYCLOAK_CLIENT_SECRET=keycloak-client-secret

# Domain Configuration
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
KEYCLOAK_HOSTNAME=auth.yourdomain.com
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

## Services

The deployment includes the following services:

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js web application |
| Backend | 8000 | FastAPI REST API |
| Postgres | 5432 | Primary database |
| Redis | 6379 | Caching and sessions |
| Keycloak | 8080 | Authentication service |
| Nginx | 80/443 | Reverse proxy |

## Deployment Commands

### Basic Operations

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
```

### Resource Monitoring

```bash
# Check resource usage
docker stats

# Check disk usage
docker system df
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

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review service logs for error messages
3. Consult the main project documentation
4. Open an issue on the GitHub repository

## File Structure

```
docker/
├── deploy.sh                    # Deployment script
├── docker-compose.prod.yaml     # Production compose file
├── env.template                 # Environment template
├── nginx/                       # Nginx configuration
│   ├── nginx.conf
│   └── conf.d/
│       └── scrumix.conf
├── ssl/                         # SSL certificates (create manually)
├── backups/                     # Database backups
└── README.md                    # This file
```
