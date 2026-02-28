# Nginx Configuration with /english Path and HTTPS

This document explains the updated Nginx configuration for hosting the English Partner application under the `/english` path with HTTPS.

## Architecture

```
Browser (HTTPS)
       ↓
https://yourdomain.com/english
       ↓
   Nginx (443)
   ├── / → Redirect to /english
   ├── /english/ → Frontend (http://frontend:3000)
   ├── /english/auth → Backend (http://backend:8000/auth)
   ├── /english/items → Backend (http://backend:8000/items)
   ├── /english/reviews → Backend (http://backend:8000/reviews)
   ├── /english/ai → Backend (http://backend:8000/ai)
   └── /english/docs → Backend (http://backend:8000/docs)
```

## Key Changes

### 1. HTTPS Configuration

The Nginx configuration now uses HTTPS (port 443) for production:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
}
```

**SSL certificates must be at:**
```
/etc/letsencrypt/live/yourdomain.com/fullchain.pem
/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

Use Let's Encrypt to generate these:
```bash
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

### 2. HTTP to HTTPS Redirect

All HTTP requests are automatically redirected to HTTPS:

```nginx
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

### 3. /english Path Routing

All routes are now under `/english`:

**Frontend:**
```nginx
location /english/ {
    proxy_pass http://frontend/;
}
```
Access: `https://yourdomain.com/english`

**Backend API:**
```nginx
location ~ ^/english/(auth|items|reviews|ai)/ {
    rewrite ^/english/(.*) /$1 break;  # Remove /english prefix
    proxy_pass http://backend;
}
```
Examples:
- `https://yourdomain.com/english/auth/login` → Backend `/auth/login`
- `https://yourdomain.com/english/items` → Backend `/items`

**API Documentation:**
```
https://yourdomain.com/english/docs
https://yourdomain.com/english/openapi.json
```

### 4. Security Enhancements

New security headers added for production:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
```

## Frontend Configuration Changes

### Next.js basePath

Updated [frontend/next.config.js](frontend/next.config.js):

```javascript
const nextConfig = {
  basePath: '/english',
  output: 'standalone',
}
```

This tells Next.js that:
- All pages are served under `/english`
- Static assets are at `/english/_next/*`
- Links and images automatically use the basePath

### API Base URL

Updated [frontend/lib/api.ts](frontend/lib/api.ts):

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://yourdomain.com/english';
```

This means API calls like:
```typescript
api.post('/auth/login')
// becomes: https://yourdomain.com/english/auth/login
```

### Environment Variables

**.env.example** (development):
```bash
NEXT_PUBLIC_API_URL=http://localhost/english
```

**.env.prod.example** (production):
```bash
NEXT_PUBLIC_API_URL=https://yourdomain.com/english
```

## Nginx Installation on External Server

### 1. Create Nginx Configuration

On your Nginx server, create `/etc/nginx/sites-available/english-partner`:

```bash
sudo nano /etc/nginx/sites-available/english-partner
```

Copy configuration from [nginx.conf](nginx.conf), adjusting:
- `yourdomain.com` to your actual domain
- `app_server_ip` to your application server IP
- SSL certificate paths if using different location

### 2. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/english-partner /etc/nginx/sites-enabled/
```

### 3. Test Configuration

```bash
sudo nginx -t
```

### 4. Restart Nginx

```bash
sudo systemctl restart nginx
```

### 5. Set Up SSL Certificates

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

## Deployment Steps

### 1. Update Environment Variables

**.env.prod:**
```bash
DATABASE_URL=postgresql://app_user:password@postgres_ip:5432/english_partner
SECRET_KEY=your_secure_key
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_API_URL=https://yourdomain.com/english
```

### 2. Deploy Containers

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Configure Nginx on External Server

Edit `/etc/nginx/sites-available/english-partner`:

**Replace these values:**
```nginx
upstream backend {
    server <your_app_server_ip>:8000;
}

upstream frontend {
    server <your_app_server_ip>:3000;
}

server {
    server_name <your_domain_name>;
    ssl_certificate /etc/letsencrypt/live/<your_domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<your_domain>/privkey.pem;
}
```

### 4. Test Application

```bash
# Test HTTPS
curl -I https://yourdomain.com/english

# Test API
curl https://yourdomain.com/english/docs

# Test health
curl https://yourdomain.com/health
```

## URL Mapping

| URL | Maps To | Purpose |
|-----|---------|---------|
| https://yourdomain.com | /english | Root redirect |
| https://yourdomain.com/english | Frontend | Application home |
| https://yourdomain.com/english/auth/login | Backend /auth/login | Login endpoint |
| https://yourdomain.com/english/items | Backend /items | Items list |
| https://yourdomain.com/english/reviews/yesterday | Backend /reviews/yesterday | Reviews |
| https://yourdomain.com/english/ai/correct-text | Backend /ai/correct-text | AI endpoints |
| https://yourdomain.com/english/docs | Backend /docs | API documentation |
| https://yourdomain.com/health | Nginx | Health check |

## CORS Configuration

The backend CORS should allow your domain:

**backend/main.py:**
```python
allow_origins=[
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]
```

## Troubleshooting

### SSL Certificate Errors

```bash
# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -noout -dates

# Check if Nginx can read the certificate
sudo cat /etc/letsencrypt/live/yourdomain.com/fullchain.pem

# Renew certificate
sudo certbot renew
```

### 502 Bad Gateway

```bash
# Check backend is running
curl -I http://app_server_ip:8000/health

# Check frontend is running
curl -I http://app_server_ip:3000

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Routes Not Working

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo nginx -s reload

# Check upstream servers
curl http://app_server_ip:8000/auth/login
curl http://app_server_ip:3000/
```

### Redirect Loop

```bash
# Clear browser cache
# Or test with curl
curl -I -H "Host: yourdomain.com" https://yourdomain.com/

# Check Nginx redirect rules
sudo nginx -T | grep -A 10 "redirect"
```

## Performance Optimization

### Enable HTTP/2

Already configured with `http2` in server block.

### Gzip Compression

Already enabled in [nginx.conf](nginx.conf) for better performance.

### SSL Session Caching

```nginx
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

### OCSP Stapling

```nginx
ssl_stapling on;
ssl_stapling_verify on;
```

## Monitoring

### Check Nginx Status

```bash
sudo systemctl status nginx
```

### View Access Logs

```bash
sudo tail -f /var/log/nginx/access.log
```

### View Error Logs

```bash
sudo tail -f /var/log/nginx/error.log
```

### Monitor Connections

```bash
sudo netstat -an | grep 443 | wc -l
```

## Related Files

- [nginx.conf](nginx.conf) - Nginx configuration file
- [frontend/next.config.js](frontend/next.config.js) - Next.js configuration with basePath
- [frontend/lib/api.ts](frontend/lib/api.ts) - Frontend API client
- [.env.example](.env.example) - Development environment variables
- [.env.prod.example](.env.prod.example) - Production environment variables
- [docker-compose.prod.yml](docker-compose.prod.yml) - Production docker compose

## Next Steps

1. ✅ Update [nginx.conf](nginx.conf) with your domain and server IPs
2. ✅ Deploy on Nginx server with SSL certificates
3. ✅ Configure backend CORS for your domain
4. ✅ Update environment variables (.env.prod)
5. ✅ Deploy containers with `docker-compose.prod.yml`
6. ✅ Test all endpoints through https://yourdomain.com/english
