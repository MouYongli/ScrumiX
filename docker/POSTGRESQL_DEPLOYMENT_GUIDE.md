# 🚀 PostgreSQL Production Deployment Guide

## 📋 Pre-Deployment Checklist

### Security Requirements
- [ ] Strong passwords for all database users
- [ ] SSL certificates generated and configured
- [ ] Firewall rules configured (only necessary ports open)
- [ ] Non-root user configured for PostgreSQL
- [ ] Regular security updates scheduled

### Performance Optimization
- [ ] Memory settings tuned for your server specs
- [ ] Connection pooling configured
- [ ] Monitoring tools set up
- [ ] Backup strategy implemented
- [ ] Resource limits configured

### Data Protection
- [ ] Automated backups configured
- [ ] Backup restoration tested
- [ ] Data encryption at rest enabled
- [ ] Network encryption (SSL/TLS) enabled

## 🔧 Deployment Steps

### 1. Environment Preparation

```bash
# Create production environment file
cp docker/env.template .env

# Update with production values
# CRITICAL: Change all default passwords!
nano .env
```

### 2. SSL Certificate Setup

```bash
# Create SSL directory
mkdir -p docker/ssl

# Generate self-signed certificate (or use real certs)
openssl req -new -text -passout pass:abcd -subj /CN=localhost -out server.req
openssl rsa -in privkey.pem -passin pass:abcd -out server.key
openssl req -x509 -in server.req -text -key server.key -out server.crt

# Copy to PostgreSQL SSL directory
cp server.{crt,key} docker/ssl/
chmod 600 docker/ssl/server.key
```

### 3. Production Deployment

```bash
# Pull latest images
docker-compose -f docker/docker-compose.prod.yaml pull

# Deploy with health checks
docker-compose -f docker/docker-compose.prod.yaml up -d

# Verify deployment
docker-compose -f docker/docker-compose.prod.yaml ps
docker-compose -f docker/docker-compose.prod.yaml logs postgres
```

### 4. Database Initialization

```bash
# Run migrations
docker-compose -f docker/docker-compose.prod.yaml exec backend alembic upgrade head

# Create initial admin user (if needed)
docker-compose -f docker/docker-compose.prod.yaml exec backend python -m scrumix.scripts.create_admin
```

## 📊 Monitoring & Maintenance

### Health Monitoring

```bash
# Check PostgreSQL health
docker-compose -f docker/docker-compose.prod.yaml exec postgres pg_isready

# Monitor connection count
docker-compose -f docker/docker-compose.prod.yaml exec postgres psql -U scrumix_user -d scrumix -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
docker-compose -f docker/docker-compose.prod.yaml exec postgres psql -U scrumix_user -d scrumix -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Backup Strategy

```bash
# Manual backup
docker-compose -f docker/docker-compose.prod.yaml exec postgres pg_dump -U scrumix_user scrumix > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script (add to cron)
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose -f docker/docker-compose.prod.yaml exec -T postgres pg_dump -U scrumix_user scrumix | gzip > $BACKUP_DIR/scrumix_backup_$DATE.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "scrumix_backup_*.sql.gz" -mtime +7 -delete
```

### Performance Tuning

```bash
# Monitor resource usage
docker stats scrumix-postgres

# Check PostgreSQL performance
docker-compose -f docker/docker-compose.prod.yaml exec postgres psql -U scrumix_user -d scrumix -c "
SELECT 
    schemaname,
    tablename,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
"
```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check if container is running
   docker-compose -f docker/docker-compose.prod.yaml ps postgres
   
   # Check logs
   docker-compose -f docker/docker-compose.prod.yaml logs postgres
   ```

2. **Out of Connections**
   ```bash
   # Check current connections
   docker-compose -f docker/docker-compose.prod.yaml exec postgres psql -U scrumix_user -d scrumix -c "SELECT count(*) FROM pg_stat_activity;"
   
   # Kill idle connections
   docker-compose -f docker/docker-compose.prod.yaml exec postgres psql -U scrumix_user -d scrumix -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < current_timestamp - INTERVAL '5 minutes';"
   ```

3. **Slow Queries**
   ```bash
   # Identify slow queries
   docker-compose -f docker/docker-compose.prod.yaml exec postgres psql -U scrumix_user -d scrumix -c "SELECT query, mean_time, calls FROM pg_stat_statements WHERE mean_time > 1000 ORDER BY mean_time DESC LIMIT 10;"
   ```

## 🔄 Scaling Considerations

### Horizontal Scaling (Read Replicas)
- Consider PostgreSQL streaming replication for read-heavy workloads
- Use connection pooling (PgBouncer) for high-concurrency applications
- Implement database sharding for very large datasets

### Vertical Scaling
- Monitor CPU, memory, and I/O usage
- Adjust PostgreSQL configuration based on server specifications
- Consider SSD storage for better I/O performance

### High Availability
- Set up PostgreSQL cluster with automatic failover
- Use external load balancer for database connections
- Implement cross-region backups for disaster recovery

## 📞 Emergency Contacts & Procedures

### Database Recovery
```bash
# Restore from backup
docker-compose -f docker/docker-compose.prod.yaml down
docker volume rm scrumix_postgres_data
docker-compose -f docker/docker-compose.prod.yaml up -d postgres
gunzip -c backup_20240101_120000.sql.gz | docker-compose -f docker/docker-compose.prod.yaml exec -T postgres psql -U scrumix_user scrumix
```

### Emergency Maintenance Window
1. Notify users of planned downtime
2. Stop application containers (keep database running)
3. Perform maintenance
4. Test database connectivity
5. Restart application containers
6. Verify system functionality
