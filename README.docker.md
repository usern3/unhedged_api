# Docker Development Setup

Complete Docker-based development environment for Unhedged API, Indexer, and Database.

## Quick Start

### 1. Initial Setup

```bash
# Run the initialization script
./scripts/docker-init.sh
```

This script will:
- Create `.env` from `.env.docker` template if it doesn't exist
- Build Docker images
- Start PostgreSQL and Redis
- Run database migrations
- Generate Prisma Client

### 2. Configure Environment

Edit `.env` and set your Canton credentials:

```bash
ADMIN_M2M_TOKEN=your-actual-m2m-token
PLATFORM_ADMIN_PARTY=your-actual-admin-party
```

### 3. Start Services

```bash
# Start all services (API, Indexer, Database, Redis)
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api
docker-compose logs -f indexer
```

## Available Services

| Service | URL/Port | Description |
|---------|----------|-------------|
| API | http://localhost:3000 | Fastify REST API |
| API Docs | http://localhost:3000/docs | Swagger UI |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache |
| Indexer | (background) | Canton event indexer |

## Common Commands

### Service Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart api

# View service status
docker-compose ps

# View logs
docker-compose logs -f [service-name]
```

### Database Operations

```bash
# Run migrations
docker-compose exec api npx prisma migrate dev

# Reset database (WARNING: destroys all data)
docker-compose exec api npx prisma migrate reset

# Open Prisma Studio
docker-compose exec api npx prisma studio

# Access PostgreSQL directly
docker-compose exec postgres psql -U unhedged -d unhedged
```

### Development Workflow

```bash
# Rebuild after dependency changes
docker-compose down
docker-compose build
docker-compose up -d

# View real-time API logs
docker-compose logs -f api

# View real-time Indexer logs
docker-compose logs -f indexer

# Execute commands in running container
docker-compose exec api sh
docker-compose exec api npm run prisma:studio
```

### Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes (deletes database data)
docker-compose down -v

# Remove containers, volumes, and images
docker-compose down -v --rmi all
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Docker Compose Stack            │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐      ┌──────────┐       │
│  │   API    │◄────►│  Redis   │       │
│  │  :3000   │      │  :6379   │       │
│  └────┬─────┘      └──────────┘       │
│       │                                 │
│       │                                 │
│       ▼                                 │
│  ┌──────────┐      ┌──────────┐       │
│  │ Indexer  │      │PostgreSQL│       │
│  │(background)◄────►│  :5432   │       │
│  └──────────┘      └──────────┘       │
│       │                                 │
│       ▼                                 │
│  ┌──────────┐                          │
│  │ Canton   │ (External)               │
│  │ Ledger   │                          │
│  └──────────┘                          │
│                                         │
└─────────────────────────────────────────┘
```

## Environment Variables

### Required (Canton Credentials)
- `ADMIN_M2M_TOKEN` - Canton M2M authentication token
- `PLATFORM_ADMIN_PARTY` - Canton platform admin party ID

### Optional (With Defaults)
- `CANTON_JSON_API_URL` - Canton API endpoint
- `CANTON_LEDGER_ID` - Canton ledger identifier
- `CANTON_APPLICATION_ID` - Application identifier
- `PACKAGE_ID` - DAML package ID
- `RATE_LIMIT_MAX_REQUESTS` - Rate limit (default: 1000)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 60000)
- `LOG_LEVEL` - Logging level (default: info)

### Auto-Configured by Docker Compose
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST` - Redis hostname
- `REDIS_PORT` - Redis port
- `REDIS_ENABLED` - Redis feature flag

## Development Features

### Hot Reload
- API and Indexer use `tsx watch` for automatic TypeScript compilation
- Source code changes trigger immediate reload
- Volumes mounted as read-only for security

### Health Checks
- PostgreSQL: `pg_isready` check every 10s
- Redis: `redis-cli ping` check every 10s
- API: HTTP health endpoint check every 30s

### Logging
- Development: Pretty-printed logs with timestamps
- Production: JSON logs for structured logging
- All services: Configurable log levels

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Find and kill process using port 5432
lsof -ti:5432 | xargs kill -9
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify PostgreSQL is healthy
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres
```

### Indexer Not Starting

```bash
# Check indexer logs
docker-compose logs indexer

# Verify Canton API connectivity
docker-compose exec indexer sh -c 'wget -O- $CANTON_JSON_API_URL/health'

# Restart indexer
docker-compose restart indexer
```

### Build Issues

```bash
# Clean rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Permission Issues

```bash
# Fix ownership of generated files
sudo chown -R $USER:$USER .
```

## Production Deployment

For production deployment, use the production Docker stage:

```bash
# Build production image
docker build --target production -t unhedged-api:latest .

# Run with production environment
docker run -d \
  --name unhedged-api \
  -p 3000:3000 \
  --env-file .env.production \
  unhedged-api:latest
```

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
- [Fastify Documentation](https://fastify.dev/)
