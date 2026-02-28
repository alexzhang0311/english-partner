# Deployment Options Summary

This project supports multiple deployment scenarios:

## 1. Development - All in One

**File**: `docker-compose.yml`

```bash
docker-compose up -d
```

**What it includes**:
- PostgreSQL container
- Backend container
- Frontend container
- Nginx container

**Use case**: Local development, testing

**Ports**:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Nginx: http://localhost

---

## 2. Production - With External PostgreSQL & Nginx

**File**: `docker-compose.prod.yml`

```bash
docker-compose -f docker-compose.prod.yml up -d
```

**What it includes**:
- Backend container (only)
- Frontend container (only)

**What you need to provide**:
- PostgreSQL server (external)
- Nginx server (external)

**Use case**: Production deployment on dedicated servers

**Ports**:
- Backend: 127.0.0.1:8000 (local only)
- Frontend: 127.0.0.1:3000 (local only)
- Access through Nginx: https://yourdomain.com

**Configuration**: [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)

---

## 3. All-in-One with Nginx

**File**: `docker-compose.nginx.yml`

```bash
docker-compose -f docker-compose.nginx.yml up -d
```

**What it includes**:
- PostgreSQL container
- Backend container
- Frontend container
- Nginx container

**Use case**: Staging, small production, easier SSL setup

**Ports**:
- Single entry point: http://localhost:80

**Configuration**: [NGINX_DEPLOYMENT.md](NGINX_DEPLOYMENT.md)

---

## Comparison Table

| Feature | docker-compose.yml | docker-compose.prod.yml | docker-compose.nginx.yml |
|---------|-------------------|----------------------|--------------------------|
| PostgreSQL | Included | External | Included |
| Nginx | Included | External | Included |
| Backend | Yes | Yes | Yes |
| Frontend | Yes | Yes | Yes |
| Data Persistence | Docker volume | External DB | Docker volume |
| SSL Setup | Template only | Your server | Built-in |
| Single port | Yes (/nginx) | No (individual) | Yes (:80) |
| Recommended | Dev/Test | Production | Staging |
| Complexity | Low | Medium | Medium |

---

## Which One Should I Use?

### For Local Development
→ Use **docker-compose.yml**
```bash
docker-compose up -d
```

### For Production Deployment
→ Use **docker-compose.prod.yml**
```bash
docker-compose -f docker-compose.prod.yml up -d
```
See [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)

### For Small Production / Testing
→ Use **docker-compose.nginx.yml**
```bash
docker-compose -f docker-compose.nginx.yml up -d
```
See [NGINX_DEPLOYMENT.md](NGINX_DEPLOYMENT.md)

---

## Environment Variables

### Development (.env)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
DATABASE_URL=postgresql://postgres:postgres@db:5432/english_partner
SECRET_KEY=dev-key-change-in-production
```

### Production (.env.prod)
```bash
NEXT_PUBLIC_API_URL=https://yourdomain.com
DATABASE_URL=postgresql://app_user:password@postgres.example.com:5432/english_partner
SECRET_KEY=your_super_secure_random_key
```

### Nginx-based (.env.nginx)
```bash
NEXT_PUBLIC_API_URL=http://localhost
DATABASE_URL=postgresql://postgres:postgres@db:5432/english_partner
SECRET_KEY=staging-key
```

---

## File Reference

```
.
├── docker-compose.yml              # Development - all-in-one
├── docker-compose.prod.yml         # Production - app containers only
├── docker-compose.nginx.yml        # Staging - all with nginx
├── .env.example                    # Development env template
├── .env.prod.example               # Production env template
├── nginx.conf                      # Nginx configuration
├── DOCKER_DEPLOYMENT.md            # Docker basics guide
├── DOCKER_NETWORK.md               # Container networking explained
├── NGINX_DEPLOYMENT.md             # Nginx setup guide
├── PRODUCTION_DEPLOYMENT.md        # Detailed production guide
├── PRODUCTION_QUICKSTART.md        # Quick production setup
└── DEPLOYMENT_OPTIONS.md           # This file
```

---

## Migration Path

### Local → Production

```bash
# 1. Test with all-in-one
docker-compose up -d

# 2. Set up external PostgreSQL and Nginx
# (Follow PRODUCTION_DEPLOYMENT.md step 1-2)

# 3. Switch to production compose
docker-compose -f docker-compose.prod.yml up -d

# 4. Migrate data
# (Follow PRODUCTION_DEPLOYMENT.md)
```

---

## Get Help

1. **Development issues**: See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)
2. **Networking problems**: See [DOCKER_NETWORK.md](DOCKER_NETWORK.md)
3. **Nginx setup**: See [NGINX_DEPLOYMENT.md](NGINX_DEPLOYMENT.md)
4. **Production deployment**: See [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
5. **Quick reference**: See [PRODUCTION_QUICKSTART.md](PRODUCTION_QUICKSTART.md)

---

## Troubleshooting by Scenario

### "I want to deploy to production"
1. Read [PRODUCTION_QUICKSTART.md](PRODUCTION_QUICKSTART.md)
2. Follow [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
3. Use `docker-compose.prod.yml`

### "I have Nginx and PostgreSQL already running"
1. Copy `.env.prod.example` to `.env.prod`
2. Update database connection and API URL
3. Run: `docker-compose -f docker-compose.prod.yml up -d`
4. Configure Nginx to proxy to container ports

### "I want a simple single-server setup"
1. Use `docker-compose.nginx.yml`
2. All services in one compose file
3. Single port 80 entry point

### "I'm testing locally before production"
1. Use `docker-compose.yml`
2. Everything included for testing
3. Easy to stop and restart
