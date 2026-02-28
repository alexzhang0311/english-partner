# Environment Variables - .env vs .env.prod

## Quick Answer

**By default, Docker Compose uses `.env`**, but `docker-compose.prod.yml` should use `.env.prod` for production.

## How to Use Correct Environment File

### Option 1: Specify env-file on Command Line (Recommended)

```bash
# Use .env.prod for production
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Use .env.nginx for nginx setup
docker-compose -f docker-compose.nginx.yml --env-file .env.nginx up -d

# Use .env for development
docker-compose -f docker-compose.yml --env-file .env up -d
```

### Option 2: Add env_file Directive (Not Recommended)

You could add this to the compose file, but command-line is cleaner:

```yaml
services:
  backend:
    env_file: .env.prod
    environment:
      ...
```

## Files & Their Purpose

| File | Used For | Command |
|------|----------|---------|
| `.env` | Development/default | `docker-compose up -d` |
| `.env.example` | Development template | Reference only |
| `.env.prod` | Production | `docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d` |
| `.env.prod.example` | Production template | Reference only |

## Current Setup

```bash
# Development (all-in-one with db & nginx)
docker-compose up -d
# Uses: .env

# Production (external db & nginx)
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
# Uses: .env.prod

# Staging (all-in-one with nginx)
docker-compose -f docker-compose.nginx.yml up -d
# Uses: .env (or you can specify: --env-file .env.staging)
```

## Example: Production Deployment

```bash
# 1. Create production environment file
cp .env.prod.example .env.prod

# 2. Edit with your production values
nano .env.prod

# 3. Deploy using .env.prod
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 4. Verify
docker-compose -f docker-compose.prod.yml --env-file .env.prod ps
```

## What Happens Without --env-file

If you run:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

Without specifying `--env-file .env.prod`, Docker Compose will look for `.env` instead, which may have development values. This could cause issues in production.

## Best Practice

Always use the correct env file:

```bash
# ✅ DO THIS
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# ❌ DON'T DO THIS
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variable Priority

When multiple `.env` files exist, Docker Compose uses this priority:

1. Command-line `--env-file` flag (highest priority)
2. `.env` file in same directory
3. Environment variables from shell

## Aliases for Convenience

Add to your `.bashrc` or `.zshrc`:

```bash
# Development
alias devup='docker-compose up -d'
alias devdown='docker-compose down'

# Production
alias produp='docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d'
alias proddown='docker-compose -f docker-compose.prod.yml --env-file .env.prod down'

# Logs
alias prodlogs='docker-compose -f docker-compose.prod.yml --env-file .env.prod logs -f'
```

Then you can simply run:
```bash
produp
prodlogs
proddown
```

## Verification

Check which environment variables are being used:

```bash
# Show environment from .env.prod
docker-compose -f docker-compose.prod.yml --env-file .env.prod config | grep -A 10 environment:
```

This will show all substituted variables from `.env.prod`.
