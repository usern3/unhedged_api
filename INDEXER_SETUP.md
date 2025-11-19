# Canton Event Indexer Setup Guide

## Overview

The Canton Event Indexer reads events from the Canton ledger and writes them to PostgreSQL for fast read queries. This implements a CQRS (Command Query Responsibility Segregation) pattern where:

- **Canton Ledger** = Source of truth for writes
- **PostgreSQL** = Optimized read model (1-5ms queries vs 500-2000ms Canton queries)
- **Indexer** = Bridge between Canton and PostgreSQL

## Architecture

```
Canton Ledger (Write) → Indexer → PostgreSQL (Read) → Fastify API
```

## Prerequisites

1. **Canton Node Access**
   - Canton JSON API URL
   - Admin M2M token
   - Platform admin party ID
   - Daml package ID

2. **PostgreSQL Database**
   - Database already configured via Prisma
   - Schema includes: markets, bets, claims, users, indexer_checkpoints

3. **Node.js & Dependencies**
   - Node.js 18+
   - Dependencies installed via `npm install`

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

This installs the new `axios` dependency needed for Canton API calls.

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Canton credentials:

```bash
# Canton Configuration
CANTON_JSON_API_URL="https://your-canton-node.com/api"
CANTON_LEDGER_ID="canton-network"
CANTON_APPLICATION_ID="unhedged-indexer"
ADMIN_M2M_TOKEN="your-canton-admin-token"
PLATFORM_ADMIN_PARTY="admin::1220xxxxxxxxxxxx"
PACKAGE_ID="your-daml-package-id"
```

**How to get these values:**
- `CANTON_JSON_API_URL`: Your Canton node's HTTP JSON API endpoint
- `CANTON_LEDGER_ID`: Your Canton network identifier
- `ADMIN_M2M_TOKEN`: Machine-to-machine authentication token from Canton
- `PLATFORM_ADMIN_PARTY`: Your platform admin party ID (format: `party::1220...`)
- `PACKAGE_ID`: Your compiled Daml package identifier

### 3. Ensure Database Schema is Up-to-Date

The Prisma schema already includes all necessary tables. Run migrations if needed:

```bash
# Generate Prisma client
npm run prisma:generate

# Apply migrations (if any pending)
npx prisma migrate deploy
```

### 4. Build TypeScript

```bash
npm run build
```

This compiles both the API and indexer to `dist/`.

## Running the Indexer

### Development Mode

Run indexer with hot-reload:

```bash
npm run dev:indexer
```

Run both API and indexer (in separate terminals):

```bash
# Terminal 1: API
npm run dev

# Terminal 2: Indexer
npm run dev:indexer
```

### Production Mode

```bash
# Build first
npm run build

# Run indexer
npm run start:indexer
```

## Deployment Options

### Option 1: Separate Containers (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: unhedged
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build: .
    command: npm start
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/unhedged
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - PORT=3000
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis

  indexer:
    build: .
    command: npm run start:indexer
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/unhedged
      - CANTON_JSON_API_URL=${CANTON_JSON_API_URL}
      - CANTON_LEDGER_ID=${CANTON_LEDGER_ID}
      - CANTON_APPLICATION_ID=unhedged-indexer
      - ADMIN_M2M_TOKEN=${ADMIN_M2M_TOKEN}
      - PLATFORM_ADMIN_PARTY=${PLATFORM_ADMIN_PARTY}
      - PACKAGE_ID=${PACKAGE_ID}
      - NODE_ENV=production
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

Run with:

```bash
docker-compose up -d
```

### Option 2: Process Manager (PM2)

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'unhedged-api',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'unhedged-indexer',
      script: 'dist/indexer/start-indexer.js',
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 5000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

Run with:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 3: Systemd Services

Create `/etc/systemd/system/unhedged-api.service`:

```ini
[Unit]
Description=Unhedged API
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/opt/unhedged_api
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/unhedged-indexer.service`:

```ini
[Unit]
Description=Unhedged Canton Indexer
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/opt/unhedged_api
ExecStart=/usr/bin/node dist/indexer/start-indexer.js
Restart=on-failure
RestartSec=5s
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable unhedged-api unhedged-indexer
sudo systemctl start unhedged-api unhedged-indexer
```

## Monitoring

### Check Indexer Status

```bash
# Development
# Check console output

# PM2
pm2 logs unhedged-indexer

# Docker
docker-compose logs -f indexer

# Systemd
sudo journalctl -u unhedged-indexer -f
```

### Check Database Checkpoint

```sql
-- Connect to PostgreSQL
psql -U postgres -d unhedged

-- Check last indexed offset
SELECT * FROM indexer_checkpoints WHERE service_name = 'market-indexer';
```

### Monitor Market Data

```sql
-- Check indexed markets
SELECT COUNT(*) FROM markets;

-- Check recent bets
SELECT * FROM bets ORDER BY created_at DESC LIMIT 10;

-- Check indexer progress
SELECT
  last_offset,
  last_updated,
  NOW() - last_updated AS time_since_update
FROM indexer_checkpoints
WHERE service_name = 'market-indexer';
```

## Troubleshooting

### Indexer Won't Start

**Check environment variables:**
```bash
npm run start:indexer
# Look for "Missing required environment variables" error
```

**Test database connection:**
```bash
npx prisma db pull
```

**Test Canton connection:**
```bash
curl -H "Authorization: Bearer $ADMIN_M2M_TOKEN" \
  $CANTON_JSON_API_URL/v2/updates
```

### Indexer Stuck at Old Offset

The indexer uses checkpoints for crash recovery. If stuck:

1. **Check Canton API is accessible**
2. **Verify the offset is valid**
3. **Manually reset checkpoint (use with caution):**

```sql
UPDATE indexer_checkpoints
SET last_offset = '0', last_updated = NOW()
WHERE service_name = 'market-indexer';
```

⚠️ **Warning:** Resetting to '0' will re-index all events from the beginning.

### Database Write Errors

Check Prisma schema matches database:

```bash
npx prisma migrate status
npx prisma migrate deploy
```

### Canton API Timeout

Increase timeout in `src/services/daml.service.ts`:

```typescript
this.client = axios.create({
  // ...
  timeout: 60000, // Increase to 60 seconds
});
```

## Performance Tuning

### Indexer Poll Interval

Adjust in `src/indexer/market-indexer.ts`:

```typescript
private pollIntervalMs: number = 1000; // Poll every 1 second
```

- **Lower** (e.g., 500ms) = Lower latency, more API calls
- **Higher** (e.g., 5000ms) = Less API load, higher latency

### Batch Size

Adjust in `src/indexer/market-indexer.ts`:

```typescript
const updates = await this.damlService.fetchUpdates(this.lastOffset, 100);
```

- **Smaller** (e.g., 50) = More frequent checkpoints, slower throughput
- **Larger** (e.g., 500) = Fewer checkpoints, faster throughput, higher memory

## Next Steps

1. **Test with Real Data**: Create test markets on Canton and verify indexing
2. **Add Monitoring**: Set up alerts for indexer lag or failures
3. **Optimize Queries**: Add materialized views for analytics (see schema.sql proposal)
4. **Scale Reads**: Add read replicas to PostgreSQL as needed

## File Structure

```
src/
├── indexer/
│   ├── market-indexer.ts      # Event processor
│   └── start-indexer.ts       # Entry point
├── services/
│   ├── daml.service.ts        # Canton API client
│   ├── market.service.ts      # Reads from PostgreSQL
│   └── cache.service.ts       # Redis cache
├── routes/
│   └── markets.ts             # API endpoints
└── index.ts                   # API entry point

prisma/
└── schema.prisma              # Database schema
```

## Key Benefits

✅ **Performance**: 1-5ms queries (vs 500-2000ms Canton queries)
✅ **Scalability**: PostgreSQL handles high read volume
✅ **Reliability**: Checkpoint-based crash recovery
✅ **Separation**: Indexer runs independently from API
✅ **Flexibility**: Add analytics, full-text search, materialized views

---

For questions or issues, check the Canton documentation at https://docs.daml.com/canton/
