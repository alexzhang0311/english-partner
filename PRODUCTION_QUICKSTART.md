# Quick Start - Production Setup

## TL;DR - 5 Steps to Deploy

### On PostgreSQL Server (Once)

```bash
# 1. Create database and user
psql -U postgres
CREATE DATABASE english_partner;
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE english_partner TO app_user;
\q

# 2. Edit /etc/postgresql/15/main/postgresql.conf
listen_addresses = '*'

# 3. Edit /etc/postgresql/15/main/pg_hba.conf
host    english_partner    app_user    <app_server_ip>/32    md5

# 4. Restart PostgreSQL
sudo systemctl restart postgresql
```

### On Nginx Server (Once)

```bash
# 1. Create Nginx config (see PRODUCTION_DEPLOYMENT.md)
# 2. Point it to your app server IP and ports

# 3. Enable SSL
sudo certbot certonly --nginx -d yourdomain.com

# 4. Test
sudo nginx -t
sudo systemctl restart nginx
```

### On Application Server (Run Containers)

```bash
# 1. Prepare environment
cp .env.prod.example .env.prod
# Edit .env.prod with your server details

# 2. Start containers
docker-compose -f docker-compose.prod.yml up -d

# 3. Verify
docker-compose -f docker-compose.prod.yml ps
curl http://localhost:8000/health
curl http://localhost:3000
```

## Configuration Checklist

- [ ] PostgreSQL remote access configured
- [ ] Database created and user added
- [ ] Nginx upstream pointing to app server
- [ ] SSL certificates installed on Nginx
- [ ] `.env.prod` file created with correct values
- [ ] Docker containers running: `docker-compose -f docker-compose.prod.yml ps`
- [ ] Health checks passing
- [ ] Can access through Nginx: `https://yourdomain.com`

## Key Environment Variables

```bash
# MUST configure these in .env.prod:
DATABASE_URL=postgresql://app_user:password@postgres_ip:5432/english_partner
SECRET_KEY=your_secure_random_key_here
NEXT_PUBLIC_API_URL=https://yourdomain.com

# Optional AI keys:
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
```

## Verify Deployment

```bash
# From application server
docker-compose -f docker-compose.prod.yml ps

# From external (through Nginx)
curl https://yourdomain.com
curl https://yourdomain.com/health
curl https://yourdomain.com/docs
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | Check if backend container is running and healthy |
| Database connection error | Verify DATABASE_URL and PostgreSQL firewall rules |
| API docs not loading | Ensure backend is accessible at localhost:8000 |
| Slow requests | Check rate limiting in Nginx, increase if needed |

## File Reference

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production compose (app containers only) |
| `.env.prod.example` | Environment variables template |
| `PRODUCTION_DEPLOYMENT.md` | Detailed setup guide |
| `PRODUCTION_QUICKSTART.md` | This file - quick reference |

See [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) for detailed instructions.
