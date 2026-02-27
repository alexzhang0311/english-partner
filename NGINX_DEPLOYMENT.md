# Nginx Reverse Proxy Configuration Guide

This guide explains how to deploy the English Partner application with Nginx as a reverse proxy.

## Architecture with Nginx

```
Internet/Browser
        ↓
    Nginx :80/:443
    ├── / → Frontend :3000
    └── /api → Backend :8000
        └── DB :5432
```

## Benefits of Using Nginx

1. **Single Entry Point**: Access both frontend and backend through port 80/443
2. **SSL Termination**: Handle HTTPS in one place
3. **Load Balancing**: Easy to scale services
4. **Security**: Rate limiting, DDoS protection
5. **Static File Serving**: Better performance for assets
6. **URL Rewriting**: Clean API paths (`/api/*`)

## Quick Start

### 1. Use the Nginx Docker Compose Configuration

```bash
# Start with nginx
docker-compose -f docker-compose.nginx.yml up -d

# Or rename it to replace the default
mv docker-compose.yml docker-compose.direct.yml
mv docker-compose.nginx.yml docker-compose.yml
docker-compose up -d
```

### 2. Access the Application

- **Application**: http://localhost
- **API**: http://localhost/api
- **API Docs**: http://localhost/docs
- **Health Check**: http://localhost/health

Note: All services now go through port 80 (nginx), not separate ports.

### 3. Update Frontend API Configuration

The frontend now calls `/api` instead of `http://localhost:8000`:

```bash
# In .env file
NEXT_PUBLIC_API_URL=http://localhost/api
```

This is already configured in `docker-compose.nginx.yml`.

## Configuration Files

### nginx.conf

The main Nginx configuration located at [nginx.conf](nginx.conf) includes:

- **Reverse Proxy**: Routes `/api` to backend, `/` to frontend
- **Rate Limiting**: API (10 req/s), General (100 req/s)
- **Security Headers**: X-Frame-Options, CSP, etc.
- **Gzip Compression**: For better performance
- **Health Checks**: `/health` endpoint

### Key Features Configured

#### 1. API Routing
```nginx
location /api {
    rewrite ^/api/(.*) /$1 break;  # Remove /api prefix
    proxy_pass http://backend;      # Forward to backend:8000
}
```

Browser calls: `http://localhost/api/users/me`  
Backend receives: `http://backend:8000/users/me`

#### 2. Frontend Routing
```nginx
location / {
    proxy_pass http://frontend;  # Forward to frontend:3000
}
```

#### 3. Rate Limiting
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
location /api {
    limit_req zone=api_limit burst=20 nodelay;
}
```

#### 4. Security Headers
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

## SSL/HTTPS Configuration

### Using Let's Encrypt (Recommended for Production)

#### Option 1: Manual Certificate Setup

1. **Get SSL certificates using Certbot**:
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Get certificates
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

2. **Copy certificates**:
```bash
mkdir ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/
```

3. **Update nginx.conf**: Uncomment the HTTPS server block and update domain name

4. **Update docker-compose.nginx.yml**:
```yaml
nginx:
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - ./ssl:/etc/nginx/ssl:ro  # Uncomment this line
```

5. **Restart**:
```bash
docker-compose -f docker-compose.nginx.yml restart nginx
```

#### Option 2: Using Docker with Certbot

Add certbot service to docker-compose:

```yaml
certbot:
  image: certbot/certbot
  volumes:
    - ./certbot/conf:/etc/letsencrypt
    - ./certbot/www:/var/www/certbot
  entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

Update nginx.conf for ACME challenge:
```nginx
location /.well-known/acme-challenge/ {
    root /var/www/certbot;
}
```

### Self-Signed Certificates (Development Only)

```bash
# Generate self-signed certificate
mkdir ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/privkey.pem \
  -out ssl/fullchain.pem \
  -subj "/CN=localhost"
```

## Production Deployment

### 1. Update Environment Variables

```bash
# .env
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

### 2. Update CORS in Backend

Edit [backend/main.py](backend/main.py):
```python
allow_origins=[
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]
```

### 3. Update nginx.conf

Replace `localhost` with your domain name in the HTTPS server block.

### 4. Security Hardening

```nginx
# Hide nginx version
server_tokens off;

# Disable API docs in production
# Comment out the /docs location block

# Add Content Security Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

# Stronger rate limits for production
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=5r/s;
```

### 5. Don't Expose Internal Ports

In `docker-compose.nginx.yml`, ensure backend and frontend don't expose ports:
```yaml
backend:
  # ports: []  # No external ports
  
frontend:
  # ports: []  # No external ports

nginx:
  ports:
    - "80:80"
    - "443:443"
```

## Monitoring and Logs

### View Nginx Logs

```bash
# Access logs
docker-compose -f docker-compose.nginx.yml logs -f nginx

# Enter container to view logs
docker exec -it english-partner-nginx tail -f /var/log/nginx/access.log
docker exec -it english-partner-nginx tail -f /var/log/nginx/error.log
```

### Nginx Status

```bash
# Check if nginx is running
docker-compose -f docker-compose.nginx.yml ps nginx

# Test nginx configuration
docker exec english-partner-nginx nginx -t

# Reload nginx configuration (without restart)
docker exec english-partner-nginx nginx -s reload
```

## Troubleshooting

### 502 Bad Gateway

**Problem**: Nginx can't reach backend/frontend

**Solutions**:
```bash
# Check if services are running
docker-compose -f docker-compose.nginx.yml ps

# Check backend logs
docker-compose -f docker-compose.nginx.yml logs backend

# Check nginx can resolve backend hostname
docker exec english-partner-nginx ping backend
```

### CORS Errors

**Problem**: Browser shows CORS errors

**Solution**: Ensure backend CORS includes nginx origin:
```python
allow_origins=["http://localhost", "https://yourdomain.com"]
```

### SSL Certificate Errors

**Problem**: Certificate not valid

**Solutions**:
```bash
# Check certificate expiry
openssl x509 -in ssl/fullchain.pem -noout -dates

# Verify certificate chain
openssl verify -CAfile ssl/fullchain.pem ssl/fullchain.pem
```

### Rate Limiting Too Aggressive

**Problem**: Legitimate requests being blocked

**Solution**: Adjust rate limits in nginx.conf:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;  # Increase rate
limit_req zone=api_limit burst=50 nodelay;  # Increase burst
```

## Advanced Configuration

### Load Balancing Multiple Backends

```nginx
upstream backend {
    least_conn;  # Load balancing method
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
}
```

Then scale backends:
```bash
docker-compose -f docker-compose.nginx.yml up -d --scale backend=3
```

### Caching Static Assets

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### WebSocket Support (if needed)

```nginx
location /ws {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## Comparison: With vs Without Nginx

### Without Nginx (docker-compose.yml)
```
Browser → localhost:3000 (Frontend)
Browser → localhost:8000 (Backend API)
```
- ✅ Simple setup
- ❌ Multiple ports
- ❌ No unified SSL
- ❌ No rate limiting

### With Nginx (docker-compose.nginx.yml)
```
Browser → localhost (Nginx)
   ├── / → Frontend
   └── /api → Backend
```
- ✅ Single entry point
- ✅ Unified SSL/HTTPS
- ✅ Rate limiting & security
- ✅ Production-ready
- ✅ Easier to scale

## Migration from Direct Access

If you're currently using the direct docker-compose.yml:

```bash
# 1. Stop current services
docker-compose down

# 2. Update .env
# Change: NEXT_PUBLIC_API_URL=http://localhost:8000
# To:     NEXT_PUBLIC_API_URL=http://localhost/api

# 3. Start with nginx
docker-compose -f docker-compose.nginx.yml up -d --build

# 4. Test
curl http://localhost/health
curl http://localhost/api/docs
```

## Files Reference

- [nginx.conf](nginx.conf) - Main nginx configuration
- [docker-compose.nginx.yml](docker-compose.nginx.yml) - Docker compose with nginx
- [backend/main.py](backend/main.py) - CORS configuration
- [.env.example](.env.example) - Environment variables template

## Support

For production deployment assistance or advanced nginx configurations, refer to:
- [Official Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Nginx Image](https://hub.docker.com/_/nginx)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
