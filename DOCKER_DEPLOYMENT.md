# Docker Deployment Guide

This guide will help you deploy the English Partner application using Docker.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd english-partner
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file and configure the following required variables:

- `DB_PASSWORD`: Set a secure password for PostgreSQL
- `SECRET_KEY`: Generate a secure random key for JWT authentication
- `OPENAI_API_KEY`: Your OpenAI API key (or Anthropic if using that provider)

Example:
```bash
# Generate a secure secret key
# On Linux/Mac:
openssl rand -hex 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 3. Build and Start the Services

```bash
docker-compose up -d
```

This will:
- Build the backend and frontend Docker images
- Start PostgreSQL database
- Run database migrations automatically
- Start the backend API on port 8000
- Start the frontend on port 3000

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Common Commands

### View Running Containers

```bash
docker-compose ps
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Stop Services

```bash
docker-compose down
```

### Stop and Remove All Data (including database)

```bash
docker-compose down -v
```

### Rebuild After Code Changes

```bash
docker-compose up -d --build
```

### Execute Commands in Containers

```bash
# Backend shell
docker-compose exec backend bash

# Database shell
docker-compose exec db psql -U postgres -d english_partner

# Frontend shell
docker-compose exec frontend sh
```

## Production Deployment

### Security Considerations

1. **Change default credentials**: Update `DB_PASSWORD` and `SECRET_KEY`
2. **Use environment-specific URLs**: Update `NEXT_PUBLIC_API_URL` for production
3. **Enable HTTPS**: Use a reverse proxy (nginx, Caddy) with SSL certificates
4. **Secure the database**: Don't expose port 5432 externally in production

### Production docker-compose.yml Example

For production, you might want to:

1. Remove exposed database port:
```yaml
db:
  ports: []  # Don't expose to host
```

2. Add a reverse proxy (nginx):
```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf
    - ./ssl:/etc/nginx/ssl
  depends_on:
    - frontend
    - backend
```

3. Use Docker secrets for sensitive data instead of .env files

### Database Backups

```bash
# Backup
docker-compose exec db pg_dump -U postgres english_partner > backup.sql

# Restore
docker-compose exec -T db psql -U postgres english_partner < backup.sql
```

## Troubleshooting

### Database Connection Issues

If the backend can't connect to the database:
```bash
# Check if database is ready
docker-compose logs db

# Restart backend after database is ready
docker-compose restart backend
```

### Port Conflicts

If ports 3000, 5432, or 8000 are already in use, modify the ports in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Use different host port
```

### Build Failures

```bash
# Clear Docker cache and rebuild
docker-compose build --no-cache
```

### Permission Issues

On Linux, if you encounter permission issues:
```bash
sudo chown -R $USER:$USER .
```

## Health Checks

All services include health checks:
- Database: Checks PostgreSQL readiness
- Backend: Depends on healthy database
- Frontend: Depends on backend availability

## Scaling

To run multiple instances of a service:
```bash
docker-compose up -d --scale backend=3
```

Note: You'll need a load balancer for this to work properly.

## Monitoring

For production monitoring, consider adding:
- Prometheus for metrics
- Grafana for visualization
- ELK stack for log aggregation

## Development vs Production

The current setup is optimized for development. For production:

1. Use `docker-compose.prod.yml` with production-specific configurations
2. Set `NODE_ENV=production`
3. Minimize logging verbosity
4. Use volume mounts only for data, not code
5. Implement proper secret management
6. Add resource limits to containers

## Support

For issues or questions, please refer to the project documentation or create an issue in the repository.
