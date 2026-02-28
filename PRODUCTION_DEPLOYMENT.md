# Production Deployment Guide - External PostgreSQL & Nginx

This guide explains how to deploy with PostgreSQL and Nginx already running on your server.

## Architecture

```
Internet/Users
       ↓
   Nginx (External Server)
   :80/:443
   ├── / → Frontend Container :3000
   └── /auth, /items, /reviews, /ai → Backend Container :8000
            ↓
     Database (External Server)
     :5432
```

## Prerequisites

- Docker & Docker Compose installed on application server
- PostgreSQL 15+ running on external server
- Nginx running on external server with SSL certificates
- Network connectivity between servers

## Step 1: Prepare External PostgreSQL

### 1.1 Create Database (on PostgreSQL server)

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE english_partner;
CREATE USER app_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE english_partner TO app_user;
ALTER DATABASE english_partner OWNER TO app_user;

# Exit
\q
```

### 1.2 Configure PostgreSQL for Remote Access

Edit `/etc/postgresql/15/main/postgresql.conf`:

```bash
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Find and modify:
```
listen_addresses = '*'  # Listen on all interfaces (or specific IP)
```

Edit `/etc/postgresql/15/main/pg_hba.conf`:

```bash
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

Add line for your app server:
```
host    english_partner    app_user    192.168.1.0/24    md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 1.3 Find PostgreSQL Server IP Address

Before testing connection, you need to know the PostgreSQL server's IP:

**From PostgreSQL Server:**
```bash
# SSH into PostgreSQL server
ssh your_postgres_server

# Find the server's IP
hostname -I
# or
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Example output: `192.168.1.50`

**From Application Server:**
```bash
# If you know hostname
nslookup postgres.example.com
ping postgres_hostname

# Or direct test
nc -zv 192.168.1.50 5432  # Check if port 5432 is open
```

**Cloud Providers:**
- **AWS RDS**: RDS Console → DB Instances → Endpoint (e.g., `english-partner-db.c9akciq32.us-east-1.rds.amazonaws.com`)
- **Google Cloud SQL**: Cloud SQL → Instance Details → Public IP
- **Azure Database**: Portal → Server Name (e.g., `postgres-server.postgres.database.azure.com`)
- **DigitalOcean**: Databases → Connection Details

### 1.4 Test Connection from Application Server

```bash
# Using psql (replace with your actual IP)
psql -h 192.168.1.50 -U app_user -d english_partner -c "SELECT version();"

# If you get an error about missing packages, just test with nc
nc -zv 192.168.1.50 5432
```

## Step 2: Prepare External Nginx

### 2.1 Configure Nginx on Your Server

Create `/etc/nginx/sites-available/english-partner`:

```nginx
upstream backend {
    server <app_server_ip>:8000;
}

upstream frontend {
    server <app_server_ip>:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    client_max_body_size 10M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=100r/s;

    # Backend API Routes
    location ~ ^/(auth|items|reviews|ai|docs|openapi.json)/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend
    location / {
        limit_req zone=general_limit burst=50 nodelay;
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/english-partner /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 3: Deploy Application Containers

### 3.1 Create .env File

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Configure with your server details:

```bash
# PostgreSQL (external server)
DATABASE_URL=postgresql://app_user:secure_password@postgres_server_ip:5432/english_partner

# JWT
SECRET_KEY=generate_a_random_secure_key

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_key
# ... other AI settings

# Frontend API URL (what browser uses)
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

### 3.2 Run Docker Containers

```bash
# Using production docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Or rename it as default
cp docker-compose.prod.yml docker-compose.yml
docker-compose up -d
```

### 3.3 Verify Deployment

```bash
# Check containers
docker-compose ps

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Test health
curl http://localhost:8000/health
curl http://localhost:3000

# Test through nginx (from outside)
curl https://yourdomain.com/health
curl https://yourdomain.com
```

## Important Configuration Notes

### Port Exposure

In `docker-compose.prod.yml`, ports are only exposed to localhost:

```yaml
ports:
  - "127.0.0.1:8000:8000"  # Only accessible from localhost
  - "127.0.0.1:3000:3000"  # Only accessible from localhost
```

This is secure - only Nginx can access these ports (on the same machine).

### CORS Configuration

Update backend CORS if using external Nginx:

```python
# backend/main.py
allow_origins=[
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]
```

### Database Connection String

The `DATABASE_URL` format:
```
postgresql://username:password@host:port/database
```

Example:
```
postgresql://app_user:mypassword123@192.168.1.50:5432/english_partner
```

## Nginx Server Configuration Template

Create `/etc/nginx/conf.d/upstream.conf` for easier management:

```nginx
# Upstream servers (in your docker network on app server)
upstream backend {
    server app_server_ip:8000 max_fails=3 fail_timeout=30s;
}

upstream frontend {
    server app_server_ip:3000 max_fails=3 fail_timeout=30s;
}
```

## Monitoring

### Check Container Status

```bash
# SSH into app server
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

### Database Backups

```bash
# From PostgreSQL server
pg_dump -h localhost -U app_user english_partner > backup_$(date +%Y%m%d).sql

# Or from app server
pg_dump -h postgres_server_ip -U app_user english_partner > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
psql -h postgres_server_ip -U app_user english_partner < backup.sql
```

## Database Migrations

Migrations should run automatically when the backend container starts:

```bash
# If manual migration needed, enter backend container
docker-compose exec backend bash

# Then run alembic
alembic upgrade head
```

## Troubleshooting

### Backend Can't Connect to Database

```bash
# Check PostgreSQL is accessible
docker exec english-partner-backend bash
psql -h postgres_server_ip -U app_user -d english_partner -c "SELECT 1"

# Check DATABASE_URL
docker-compose config | grep DATABASE_URL
```

### Nginx Returns 502 Bad Gateway

```bash
# Check if containers are running
docker-compose ps

# Check container logs
docker-compose logs backend
docker-compose logs frontend

# Test local connectivity
docker exec english-partner-backend curl http://localhost:8000/health
```

### Can't Connect to Nginx from External Server

```bash
# Check Nginx is running
sudo systemctl status nginx

# Check Nginx config
sudo nginx -t

# Check firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# Test locally
curl http://localhost/health
curl https://yourdomain.com/health
```

## Scaling & High Availability

### Multiple Backend Instances

If using load balancing in Nginx:

```bash
# Scale backend containers
docker-compose up -d --scale backend=3
```

Update Nginx upstream:
```nginx
upstream backend {
    server app_server_ip:8000;
    server app_server_ip:8001;
    server app_server_ip:8002;
}
```

Modify docker-compose to use different ports for each replica.

### Database Replication

For high availability, consider PostgreSQL replication:
- Primary-Standby replication
- Multi-master with pgpool
- Cloud-managed PostgreSQL (AWS RDS, Google Cloud SQL, Azure Database)

### Nginx High Availability

Use Keepalived for Nginx failover between servers.

## Security Best Practices

### 1. PostgreSQL Security

```bash
# Change default password
sudo -u postgres psql
\password postgres
```

### 2. Database User Permissions

```sql
-- Restrict app_user to only the application database
GRANT USAGE ON SCHEMA public TO app_user;
GRANT CREATE ON SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

### 3. Firewall Rules

```bash
# Only allow app server to access PostgreSQL
sudo ufw allow from app_server_ip to any port 5432

# Only allow specific IPs to access Nginx
sudo ufw allow from 0.0.0.0/0 to any port 80
sudo ufw allow from 0.0.0.0/0 to any port 443
```

### 4. SSL Certificates

Use Let's Encrypt for free SSL:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

## Environment-Specific Files

| File | Purpose |
|------|---------|
| `.env.example` | Development environment template |
| `.env.prod.example` | Production environment template |
| `docker-compose.yml` | Development (includes db & nginx) |
| `docker-compose.prod.yml` | Production (external db & nginx) |
| `docker-compose.nginx.yml` | All-in-one with bundled nginx |

## Migration from All-in-One Deployment

If upgrading from `docker-compose.yml`:

```bash
# 1. Backup data
docker-compose exec db pg_dump -U postgres english_partner > backup.sql

# 2. Stop old containers
docker-compose down

# 3. Export data (if needed)
# Transfer backup.sql to PostgreSQL server and restore

# 4. Start new containers
docker-compose -f docker-compose.prod.yml up -d

# 5. Restore data on new database
psql -h postgres_server_ip -U app_user english_partner < backup.sql
```

## Support

For issues or questions:
1. Check container logs: `docker-compose logs -f`
2. Review Nginx access logs: `/var/log/nginx/access.log`
3. Check PostgreSQL logs: `/var/log/postgresql/postgresql.log`
4. Refer to official documentation links

## Next Steps

- Configure automated backups
- Set up monitoring (Prometheus/Grafana)
- Implement log aggregation (ELK stack)
- Plan disaster recovery strategy
