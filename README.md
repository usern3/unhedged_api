# Unhedged API - Crypto Trollbox

A production-ready crypto trollbox/chatbox API built with Fastify, Prisma, TypeScript, and WebSockets.

## 🚀 Features

- **Real-time Chat** - WebSocket support for instant message delivery
- **Fastify** - High-performance web framework
- **Prisma** - Next-generation ORM with type-safe database access
- **TypeScript** - Full type safety across the stack
- **PostgreSQL** - Robust relational database
- **Message Reactions** - Emoji reactions with user tracking
- **Wallet Integration** - Support for crypto wallet addresses
- **Pagination** - Efficient message loading with cursor-based pagination
- **Auto-generated Types** - Prisma generates TypeScript types from your schema
- **Graceful Shutdown** - Proper cleanup of database connections
- **Development Logger** - Pretty-printed logs with pino-pretty

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
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

Edit `.env` and configure your database connection:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
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
```bash
npm run dev
```

The server will start on `http://localhost:3000` with hot-reload enabled.

### Production Build
```bash
npm run build
npm start
```

## 📡 API Endpoints

### Health Check
- `GET /health` - Check server status

### WebSocket
- `WS /ws` - Real-time chat WebSocket connection

### Users
- `POST /api/users` - Create or get user (returns existing user if username exists)
- `GET /api/users/:username` - Get user by username with message/reaction counts
- `PATCH /api/users/:id` - Update user avatar or wallet address

### Messages
- `GET /api/messages?limit=50&before=<timestamp>` - Get recent messages (paginated)
- `GET /api/messages/:id` - Get single message with reactions
- `POST /api/messages` - Post new message
- `PATCH /api/messages/:id` - Edit message (requires userId authorization)
- `DELETE /api/messages/:id` - Delete message (requires userId authorization)

### Reactions
- `POST /api/reactions` - Add emoji reaction to message
- `DELETE /api/reactions/:id` - Remove reaction (requires userId authorization)
- `GET /api/messages/:messageId/reactions` - Get all reactions for a message (grouped by emoji)

## 📝 Example Requests

### Create User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"cryptotrader","walletAddress":"0x1234...","avatar":"https://..."}'
```

### Post Message
```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"To the moon! 🚀","userId":"<user-id>"}'
```

### Get Messages (Paginated)
```bash
# Get latest 50 messages
curl http://localhost:3000/api/messages?limit=50

# Get messages before a specific timestamp
curl http://localhost:3000/api/messages?limit=50&before=2024-01-15T10:30:00Z
```

### Add Reaction
```bash
curl -X POST http://localhost:3000/api/reactions \
  -H "Content-Type: application/json" \
  -d '{"emoji":"🚀","messageId":"<message-id>","userId":"<user-id>"}'
```

### WebSocket Connection (JavaScript)
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  console.log('Connected to trollbox');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch(data.type) {
    case 'connected':
      console.log('Welcome:', data.message);
      break;
    case 'new_message':
      console.log('New message:', data.data);
      break;
    case 'new_reaction':
      console.log('New reaction:', data.data);
      break;
  }
};

// Send ping to keep connection alive
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 30000);
```

## 🗄️ Database Schema

The application includes three models:

- **User**: id, username, walletAddress, avatar, messages, reactions, createdAt, updatedAt
- **Message**: id, content, userId, user, reactions, isEdited, createdAt, updatedAt
- **Reaction**: id, emoji, messageId, userId, user, message, createdAt

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## 🏗️ Project Structure

```
unhedged_api/
├── src/
│   ├── index.ts              # Server entry point
│   ├── plugins/
│   │   ├── prisma.ts         # Prisma plugin
│   │   └── websocket.ts      # WebSocket plugin
│   ├── routes/
│   │   ├── users.ts          # User endpoints
│   │   ├── messages.ts       # Message endpoints
│   │   └── reactions.ts      # Reaction endpoints
│   └── types/
│       └── fastify.d.ts      # Type declarations
├── prisma/
│   └── schema.prisma         # Database schema
├── .env                      # Environment variables
├── tsconfig.json             # TypeScript config
└── package.json              # Dependencies
```

## 🔐 Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (default: info)

## 🧪 Development Tips

1. **View Database in GUI**: Run `npm run prisma:studio` to explore your data
2. **Schema Changes**: After modifying `schema.prisma`, run `npm run prisma:migrate` and `npm run prisma:generate`
3. **Type Safety**: TypeScript and Prisma provide end-to-end type safety
4. **Auto-completion**: Your IDE will provide full autocomplete for database queries

## 📚 Tech Stack Documentation

- [Fastify](https://fastify.dev/) - Web framework
- [Prisma](https://www.prisma.io/) - ORM
- [TypeScript](https://www.typescriptlang.org/) - Language
- [PostgreSQL](https://www.postgresql.org/) - Database

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

ISC
