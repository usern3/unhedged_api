# Unhedged API - Prediction Markets Platform

A production-ready prediction markets platform with Canton blockchain integration, event indexing (CQRS), and real-time community chat features. Built with Fastify, Prisma, TypeScript, and PostgreSQL.

## 🏗️ Architecture

```
Canton Ledger (Write) → Event Indexer → PostgreSQL (Read) → Fastify API
                                                           → WebSocket Chat
```

**CQRS Pattern:**
- **Canton Ledger** - Source of truth for prediction markets
- **Event Indexer** - Syncs Canton events to PostgreSQL
- **PostgreSQL** - Optimized read model (1-5ms queries vs 500-2000ms Canton queries)
- **Fastify API** - High-performance REST + WebSocket endpoints

## 🚀 Features

### Prediction Markets
- **Canton Integration** - On-chain prediction markets with Daml smart contracts
- **Event Indexing** - Real-time sync from Canton to PostgreSQL with checkpoint recovery
- **Market Management** - Create, resolve, and monitor prediction markets
- **Betting System** - Place bets with multiple token standards (splice-cc, cip-56)
- **Claims Processing** - Automated winning claim distribution
- **Analytics** - Comprehensive market statistics and monitoring
- **Performance** - Sub-5ms queries with Redis caching

### Community Chat
- **Real-time Chat** - WebSocket support for instant message delivery
- **Message Reactions** - Emoji reactions with user tracking
- **User Profiles** - Wallet integration and user statistics
- **Pagination** - Efficient message loading with cursor-based pagination

### Technical Features
- **Fastify** - High-performance web framework
- **Prisma** - Type-safe ORM with auto-generated types
- **TypeScript** - Full type safety across the stack
- **PostgreSQL** - Robust relational database
- **Redis** - Optional caching layer with graceful degradation
- **Rate Limiting** - Per-route request throttling
- **WebSockets** - Real-time bidirectional communication
- **Swagger/OpenAPI** - Interactive API documentation with schema validation
- **Graceful Shutdown** - Proper cleanup of connections

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- Canton node access (for markets functionality)
- Redis (optional, for caching)
- npm or yarn

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd unhedged_api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure your database and Canton connection:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/unhedged?schema=public"

# Canton Configuration
CANTON_JSON_API_URL="https://your-canton-node.com/api"
CANTON_LEDGER_ID="canton-network"
CANTON_APPLICATION_ID="unhedged-indexer"
ADMIN_M2M_TOKEN="your-canton-admin-token"
PLATFORM_ADMIN_PARTY="admin::1220xxxxxxxxxxxx"
PACKAGE_ID="your-daml-package-id"

# Redis Cache (Optional)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_ENABLED="true"

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS="1000"
RATE_LIMIT_WINDOW_MS="60000"

# Server
PORT="3000"
HOST="0.0.0.0"
NODE_ENV="development"
LOG_LEVEL="info"
```

4. Generate Prisma Client:
```bash
npm run prisma:generate
```

5. Run database migrations:
```bash
npm run prisma:migrate
```

## 🏃 Running the Application

### Development Mode

**API Server:**
```bash
npm run dev
```

**Event Indexer:**
```bash
npm run dev:indexer
```

The API server will start on `http://localhost:3000` with hot-reload enabled.
The indexer will continuously sync Canton events to PostgreSQL.

### Production Build

```bash
npm run build
npm start              # Start API
npm run start:indexer  # Start indexer (separate process)
```

## 📡 API Endpoints

### Interactive API Documentation

**Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)

Full OpenAPI 3.0 specification with interactive request/response testing, schema validation, and detailed endpoint documentation.

### Endpoint Overview

- **Markets**: `/api/markets` - List, filter, and get market details/stats
- **Analytics**: `/api/analytics` - Market and platform analytics
- **Chat**: `/ws` (WebSocket), `/api/messages`, `/api/reactions`
- **Users**: `/api/users` - Create and manage user profiles
- **Health**: `/health` - Server status check

### API Documentation Features

- **Interactive Testing** - Try API calls directly from the browser
- **Request/Response Schemas** - Complete JSON schema definitions
- **Authentication** - Security requirements and token formats
- **Error Codes** - Detailed error response documentation
- **Rate Limits** - Per-endpoint rate limiting information

## 🗄️ Database Schema

**Core Models**: User, Message, Reaction, Market, Bet, Claim, IndexerCheckpoint

See `prisma/schema.prisma` for complete schema definitions.

## 🔄 Canton Event Indexer

The indexer syncs Canton ledger events to PostgreSQL with checkpoint-based crash recovery and automatic retry. Runs as a separate process from the API.

See `INDEXER_SETUP.md` for setup and monitoring details.

## 🔧 Available Scripts

- `npm run dev` - Start API server with hot-reload
- `npm run dev:indexer` - Start event indexer with hot-reload
- `npm run build` - Build for production
- `npm start` - Start production API server
- `npm run start:indexer` - Start production indexer
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## 🏗️ Project Structure

```text
src/
├── index.ts           # API server
├── indexer/           # Canton event indexer
├── plugins/           # Fastify plugins
├── routes/            # API endpoints
├── services/          # Business logic
└── types/             # TypeScript declarations
```

## 🔐 Environment Variables

**Required**: `DATABASE_URL`, Canton config (`CANTON_JSON_API_URL`, `ADMIN_M2M_TOKEN`, `PLATFORM_ADMIN_PARTY`, `PACKAGE_ID`)

**Optional**: Redis (`REDIS_HOST`, `REDIS_PORT`), Rate limiting, Server config

See `.env.example` for complete list with descriptions.

## 🚀 Deployment

Requires two processes: **API Server** + **Event Indexer**

Supports Docker Compose, PM2, or systemd. See `INDEXER_SETUP.md` for detailed deployment configurations.

## 🧪 Development Tips

1. **View Database in GUI**: Run `npm run prisma:studio` to explore your data
2. **Schema Changes**: After modifying `schema.prisma`, run `npm run prisma:migrate` and `npm run prisma:generate`
3. **Type Safety**: TypeScript and Prisma provide end-to-end type safety
4. **Auto-completion**: Your IDE will provide full autocomplete for database queries
5. **Monitor Indexer**: Check `indexer_checkpoints` table for sync status
6. **Performance**: Use Redis caching for production deployments
7. **API Documentation**: Access interactive docs at `/docs` - automatically updates as you add route schemas

## ⚡ Performance

- **API Queries**: 1-5ms with PostgreSQL (vs 500-2000ms Canton queries)
- **Caching**: 30-60s TTL for market data
- **Rate Limiting**: 1000 req/min per endpoint (configurable)
- **WebSocket**: Real-time updates with minimal latency

## 📚 Tech Stack Documentation

- [Fastify](https://fastify.dev/) - Web framework
- [@fastify/swagger](https://github.com/fastify/fastify-swagger) - OpenAPI schema generation
- [@fastify/swagger-ui](https://github.com/fastify/fastify-swagger-ui) - Interactive API documentation
- [Prisma](https://www.prisma.io/) - ORM
- [TypeScript](https://www.typescriptlang.org/) - Language
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Canton](https://docs.daml.com/canton/) - Blockchain ledger
- [Daml](https://docs.daml.com/) - Smart contract language
- [Redis](https://redis.io/) - Caching layer

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

ISC
