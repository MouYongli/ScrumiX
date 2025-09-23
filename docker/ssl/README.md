# SSL Certificate Setup

## For Development/Testing
Place self-signed certificates here:
- `cert.pem` - SSL certificate
- `key.pem` - Private key

## For Production
Replace with real certificates from your SSL provider or Let's Encrypt.

## Generate Self-Signed Certificates (Development Only)
```bash
# On Linux/Mac or WSL
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -subj "/C=US/ST=State/L=City/O=ScrumiX/CN=localhost"

# Or use Docker
docker run --rm -v $(pwd):/certs alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /certs/key.pem -out /certs/cert.pem \
  -subj "/C=US/ST=State/L=City/O=ScrumiX/CN=localhost"
```

## Production SSL Setup
1. Obtain certificates from your SSL provider or Let's Encrypt
2. Place certificates in this directory
3. Update nginx configuration with correct paths
4. Uncomment HTTPS server block in nginx/conf.d/scrumix.conf
