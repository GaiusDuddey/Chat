# 💬 RealChat — Real-Time Chat System

> A full-stack, production-grade real-time chat application inspired by WhatsApp and Telegram. Built to learn and demonstrate system design principles including WebSocket communication, message persistence, presence tracking, and horizontal scalability.

---

## 📌 Table of Contents

- [Project Overview](#project-overview)
- [System Design](#system-design)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Design](#api-design)
- [WebSocket Events](#websocket-events)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Scaling Considerations](#scaling-considerations)
- [Learning Goals](#learning-goals)

---

## 📖 Project Overview

RealChat is a real-time messaging platform that supports one-on-one and group conversations. Users can send text messages, see who is online, get delivery and read receipts, and receive instant notifications — all powered by WebSockets.

This project is intentionally designed to be a **learning playground for system design concepts** such as:

- Real-time bidirectional communication
- Message fan-out strategies
- Presence and heartbeat systems
- Horizontal scaling with pub/sub
- Optimistic UI updates and eventual consistency

---

## 🏗️ System Design

### High-Level Architecture

```
┌────────────────────────────────────────────────────────┐
│                      CLIENT (React)                    │
│         HTTP REST  +  WebSocket (Socket.IO)            │
└───────────────────────┬────────────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │    API Gateway /    │
              │   Load Balancer    │
              └──────┬──────┬──────┘
                     │      │
          ┌──────────▼──┐ ┌─▼──────────┐
          │  REST API   │ │  WebSocket │
          │  Server     │ │  Server    │
          │  (Express)  │ │ (Socket.IO)│
          └──────┬──────┘ └─────┬──────┘
                 │              │
         ┌───────▼──────────────▼───────┐
         │         Redis                │
         │  (Pub/Sub + Presence Cache   │
         │   + Session Store)           │
         └──────────────┬───────────────┘
                        │
              ┌─────────▼──────────┐
              │     PostgreSQL      │
              │  (Users, Messages,  │
              │   Conversations)    │
              └────────────────────┘
```

### Key Design Decisions

| Concern | Decision | Reasoning |
|---|---|---|
| Real-time transport | WebSockets (Socket.IO) | Full-duplex, low latency; fallback to long polling |
| Message storage | PostgreSQL | ACID compliance, relational data model |
| Presence & pub/sub | Redis | In-memory speed, built-in TTL for heartbeat, pub/sub for multi-server fan-out |
| Media storage | AWS S3 / Cloudinary | Offload binary blobs from the DB |
| Auth | JWT + Refresh Tokens | Stateless auth with short-lived access tokens |
| Horizontal scaling | Redis pub/sub adapter | Allows multiple WS servers to share events |

---

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js** — REST API server
- **Socket.IO** — WebSocket server with rooms and namespaces
- **PostgreSQL** — Primary database (users, messages, conversations)
- **Redis** — Pub/sub message broker, presence tracking, session/token cache
- **Prisma ORM** — Type-safe database access and migrations
- **JWT** — Authentication (access + refresh token flow)
- **Multer + AWS S3** — File and image upload handling
- **BullMQ** — Background job queue (notifications, email)

### Frontend
- **React.js** (Vite) — UI framework
- **Socket.IO Client** — WebSocket connection
- **Zustand** — Lightweight global state management
- **React Query (TanStack Query)** — Server state, caching, optimistic updates
- **Tailwind CSS** — Utility-first styling
- **date-fns** — Timestamp formatting

### Infrastructure / DevOps
- **Docker + Docker Compose** — Containerised local development
- **Nginx** — Reverse proxy and static file serving
- **GitHub Actions** — CI/CD pipeline
- **Render / Railway / AWS EC2** — Deployment targets

---

## ✨ Features

### Core Messaging
- [x] One-on-one private messaging
- [x] Group chat (create, add/remove members, set group name and avatar)
- [x] Text messages
- [x] Image and file attachments (S3 upload)
- [x] Message timestamps
- [x] Edit and delete messages (soft delete)

### Real-Time
- [x] Instant message delivery via WebSockets
- [x] Typing indicators ("User is typing…")
- [x] Online/offline presence status
- [x] Last seen timestamp
- [x] Message delivery receipt (✓ sent, ✓✓ delivered)
- [x] Read receipts (✓✓ blue / seen)

### Authentication & Users
- [x] Register with email and password
- [x] Login with JWT (access + refresh token rotation)
- [x] Profile: username, bio, avatar upload
- [x] Search users by username or email

### Notifications
- [x] In-app notification badge
- [x] Browser push notifications (Web Push API)
- [x] Email notifications for offline users (BullMQ job)

### UX
- [x] Infinite scroll for message history (cursor-based pagination)
- [x] Optimistic UI — message appears instantly before server confirms
- [x] Unread message count per conversation
- [x] Conversation list sorted by latest message

---

## 🗂️ Architecture

### Message Flow (Send a Message)

```
User A types a message and hits Send
       │
       ▼
React emits socket event:  chat:message  ──────────────────────────────────────►
                                                                  Socket.IO Server
                                                                         │
                                               1. Validate & authenticate │
                                               2. Save to PostgreSQL      │
                                               3. Publish to Redis channel│
                                                    redis.publish("room:XYZ", msg)
                                                                         │
                                    ┌────────────────────────────────────┘
                                    │  All Socket.IO servers subscribed to Redis
                                    │  receive the message and emit to connected
                                    │  recipients in that room
                                    ▼
                            User B's Socket.IO server emits  chat:message  to User B
                                    │
                                    ▼
                            User B's React app receives the message and renders it
```

### Presence System (Heartbeat)

```
Client ──── every 30s ────► socket.emit("heartbeat")
                                    │
                          Server sets Redis key:
                          presence:{userId} = "online"  TTL = 35s
                                    │
                          On disconnect or TTL expiry:
                          Broadcast "user:offline" event to relevant rooms
```

### Read Receipt Flow

```
User B opens conversation
       │
       ▼
Emit:  chat:read  { conversationId, lastReadMessageId }
       │
       ▼
Server updates  message_status  table
       │
       ▼
Publish to Redis → User A's server emits  chat:read_ack  to User A
       │
       ▼
User A's UI updates double-tick to blue ✓✓
```

---

## 🗄️ Database Schema

```sql
-- Users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    VARCHAR(50) UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url  TEXT,
  bio         TEXT,
  last_seen   TIMESTAMP,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Conversations (supports 1:1 and group)
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(10) CHECK (type IN ('direct', 'group')) NOT NULL,
  name        VARCHAR(100),           -- NULL for direct
  avatar_url  TEXT,                   -- NULL for direct
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE conversation_members (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  role            VARCHAR(10) DEFAULT 'member', -- 'admin' | 'member'
  joined_at       TIMESTAMP DEFAULT NOW(),
  last_read_at    TIMESTAMP,
  PRIMARY KEY (conversation_id, user_id)
);

-- Messages
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES users(id),
  content         TEXT,
  type            VARCHAR(20) DEFAULT 'text',  -- 'text' | 'image' | 'file'
  media_url       TEXT,
  reply_to_id     UUID REFERENCES messages(id),
  is_deleted      BOOLEAN DEFAULT FALSE,
  edited_at       TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Message delivery/read status
CREATE TABLE message_status (
  message_id  UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(10) CHECK (status IN ('delivered', 'read')) NOT NULL,
  updated_at  TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

**Indexes for performance:**
```sql
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_conversation_members_user ON conversation_members(user_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
```

---

## 🔌 API Design

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns access + refresh token |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate refresh token |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/me` | Get current user profile |
| PATCH | `/api/users/me` | Update profile (bio, avatar) |
| GET | `/api/users/search?q=` | Search users by username or email |
| GET | `/api/users/:id` | Get a user's public profile |

### Conversations
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/conversations` | List all conversations for current user |
| POST | `/api/conversations` | Create a new conversation (direct or group) |
| GET | `/api/conversations/:id` | Get conversation details + members |
| PATCH | `/api/conversations/:id` | Update group name/avatar (admin only) |
| POST | `/api/conversations/:id/members` | Add member to group |
| DELETE | `/api/conversations/:id/members/:userId` | Remove member from group |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/conversations/:id/messages` | Paginated message history (cursor-based) |
| POST | `/api/conversations/:id/messages` | Send a message (REST fallback) |
| PATCH | `/api/messages/:id` | Edit a message |
| DELETE | `/api/messages/:id` | Soft-delete a message |
| POST | `/api/messages/upload` | Upload image/file, returns media URL |

---

## ⚡ WebSocket Events

### Client → Server (Emit)
| Event | Payload | Description |
|---|---|---|
| `chat:message` | `{ conversationId, content, type, replyToId? }` | Send a message |
| `chat:typing_start` | `{ conversationId }` | Start typing indicator |
| `chat:typing_stop` | `{ conversationId }` | Stop typing indicator |
| `chat:read` | `{ conversationId, lastMessageId }` | Mark messages as read |
| `chat:join` | `{ conversationId }` | Join a conversation room |
| `chat:leave` | `{ conversationId }` | Leave a conversation room |
| `heartbeat` | — | Keep-alive / presence ping |

### Server → Client (On)
| Event | Payload | Description |
|---|---|---|
| `chat:message` | `{ message }` | New message received |
| `chat:message_updated` | `{ messageId, content, editedAt }` | Message was edited |
| `chat:message_deleted` | `{ messageId }` | Message was deleted |
| `chat:typing` | `{ userId, conversationId, isTyping }` | Typing indicator from another user |
| `chat:read_ack` | `{ userId, conversationId, lastMessageId }` | Read receipt update |
| `user:online` | `{ userId }` | User came online |
| `user:offline` | `{ userId, lastSeen }` | User went offline |
| `conversation:new` | `{ conversation }` | Added to a new conversation |

---

## 📁 Project Structure

```
realchat/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts              # Prisma client setup
│   │   │   └── redis.ts           # Redis client setup
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── conversation.controller.ts
│   │   │   └── message.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts  # JWT verification
│   │   │   ├── error.middleware.ts
│   │   │   └── upload.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── conversation.routes.ts
│   │   │   └── message.routes.ts
│   │   ├── socket/
│   │   │   ├── index.ts           # Socket.IO server init
│   │   │   ├── handlers/
│   │   │   │   ├── message.handler.ts
│   │   │   │   ├── presence.handler.ts
│   │   │   │   └── typing.handler.ts
│   │   │   └── middleware/
│   │   │       └── socketAuth.ts  # Authenticate WS connections
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── message.service.ts
│   │   │   ├── presence.service.ts
│   │   │   └── notification.service.ts
│   │   ├── jobs/
│   │   │   └── emailNotification.job.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   └── pagination.ts
│   │   └── app.ts                 # Express app entry point
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── MessageInput.tsx
│   │   │   │   └── TypingIndicator.tsx
│   │   │   ├── Sidebar/
│   │   │   │   ├── ConversationList.tsx
│   │   │   │   ├── ConversationItem.tsx
│   │   │   │   └── SearchUsers.tsx
│   │   │   └── UI/
│   │   │       ├── Avatar.tsx
│   │   │       └── Badge.tsx
│   │   ├── hooks/
│   │   │   ├── useSocket.ts       # Socket.IO connection hook
│   │   │   ├── useMessages.ts     # React Query for message fetching
│   │   │   └── usePresence.ts     # Online status tracking
│   │   ├── store/
│   │   │   ├── authStore.ts       # Zustand: user/token state
│   │   │   └── chatStore.ts       # Zustand: active conversation
│   │   ├── api/
│   │   │   └── client.ts          # Axios instance with interceptors
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── Chat.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
├── nginx.conf
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v20+
- Docker and Docker Compose
- Git

### 1. Clone the repository

```bash
git clone https://github.com/your-username/realchat.git
cd realchat
```

### 2. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Set up environment variables

Copy the example files and fill in your values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 4. Start with Docker Compose (recommended)

```bash
docker-compose up --build
```

This spins up:
- PostgreSQL on port `5432`
- Redis on port `6379`
- Backend API on port `4000`
- Frontend (Vite dev) on port `5173`
- Nginx reverse proxy on port `80`

### 5. Run database migrations

```bash
cd backend
npx prisma migrate dev
npx prisma db seed   # optional: seed demo users
```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

```env
# App
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/realchat

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3 (for file uploads)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=realchat-media

# Email (optional)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASS=your_pass

# Client origin (CORS)
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

---

## ▶️ Running the App

### Development (without Docker)

```bash
# Terminal 1 — Start PostgreSQL and Redis via Docker
docker-compose up postgres redis

# Terminal 2 — Backend
cd backend
npx prisma migrate dev
npm run dev

# Terminal 3 — Frontend
cd frontend
npm run dev
```

### Production build

```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build
# Serve dist/ with nginx or any static host
```

---

## 📈 Scaling Considerations

This section documents how the system would scale beyond a single server — a core part of the system design learning.

### Problem: Multiple WebSocket Servers

When you run two Socket.IO server instances, a message emitted on Server 1 will NOT reach a user connected to Server 2.

### Solution: Redis Pub/Sub Adapter

```
Server 1                    Server 2
   │                            │
   │   redis.publish(room, msg) │
   └──────────► Redis ◄─────────┘
                  │
     Delivers to all subscribed servers
```

Install the adapter: `npm install @socket.io/redis-adapter`

```typescript
import { createAdapter } from "@socket.io/redis-adapter";
const pubClient = redis.createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

### Other Scaling Notes

- **Database read replicas** — Route `SELECT` queries to a read replica; `INSERT`/`UPDATE` to primary.
- **Message pagination** — Always use **cursor-based pagination** (by `created_at` + `id`), never offset-based; offset degrades with large datasets.
- **Connection limits** — Each Socket.IO server can handle ~10k concurrent connections. Use a load balancer with **sticky sessions** (or Redis session store) to route users consistently.
- **Fan-out for large groups** — For groups with thousands of members, consider an async fan-out queue (BullMQ) instead of synchronous socket emits.
- **CDN for media** — Serve S3-hosted images via CloudFront to reduce latency globally.

---

## 🎓 Learning Goals

This project is designed to teach the following system design and engineering concepts:

| Concept | Where it appears |
|---|---|
| WebSocket protocol | Socket.IO server and client |
| HTTP vs WebSocket trade-offs | REST for history, WS for real-time |
| Pub/Sub pattern | Redis adapter for multi-server WS |
| Database indexing | Messages indexed by conversation + timestamp |
| Cursor-based pagination | Message history endpoint |
| Presence system & heartbeat | Redis TTL + heartbeat socket event |
| JWT auth with refresh tokens | Auth service + token rotation |
| Optimistic UI updates | React Query `onMutate` callback |
| Message delivery guarantees | Ack events + delivery status table |
| Horizontal scaling | Redis adapter, stateless API servers |
| Background jobs | BullMQ for offline email notifications |
| CORS and security | Helmet, rate limiting, input validation |

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

MIT