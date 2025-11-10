# MindHive Quick Start Guide

## 🚀 Fast Setup (5 Minutes)

### Prerequisites
- ✅ Node.js 20+ (You have v20.19.5)
- ✅ npm 10+ (Installed)
- ⚠️ PostgreSQL 16+ (Needs configuration)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit .env and set:
# 1. DATABASE_URL with your PostgreSQL credentials
# 2. JWT_SECRET (generate a random string)
# 3. At least one AI API key (optional for testing)
```

### Step 3: Set Up Database
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed sample data
npm run db:seed
```

### Step 4: Validate Setup
```bash
npm run validate
```

### Step 5: Start Development Server
```bash
npm run dev
```

Server will start at: `http://localhost:3000`

---

## 🔑 AI Provider Setup (Optional)

MindHive supports 5 AI providers. Configure at least one in `.env`:

### OpenAI (Recommended)
```bash
OPENAI_API_KEY=sk-...
```
Get key: https://platform.openai.com/api-keys

### Anthropic Claude
```bash
ANTHROPIC_API_KEY=sk-ant-...
```
Get key: https://console.anthropic.com/

### Google Gemini
```bash
GOOGLE_API_KEY=...
```
Get key: https://makersuite.google.com/app/apikey

### Grok (xAI)
```bash
GROK_API_KEY=...
GROK_API_URL=https://api.x.ai/v1
```
Get key: https://x.ai/

### Ollama (Local - No API Key Needed)
```bash
OLLAMA_HOST=http://localhost:11434
```
Install: https://ollama.ai/

---

## 🐳 Docker Quick Start (Alternative)

If you prefer Docker:

```bash
# Build and start all services
npm run docker:up

# Check logs
npm run docker:logs

# Stop services
npm run docker:down
```

This starts:
- Backend API (port 3000)
- PostgreSQL (port 5432)
- Redis (port 6379)
- Ollama (port 11434)
- Prometheus (port 9090)
- Grafana (port 3030)

---

## 🧪 Testing Without AI Keys

You can test core functionality without AI API keys:

```bash
# Run tests (uses mocked AI responses)
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Watch mode
npm run test:watch
```

---

## 📝 First API Call

### 1. Register a User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@mindhive.dev",
    "password": "SecurePass123!",
    "name": "Demo User"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@mindhive.dev",
    "password": "SecurePass123!"
  }'
```

Save the returned `token` for authenticated requests.

### 3. Generate Code (Requires AI Key)
```bash
curl -X POST http://localhost:3000/api/v1/code/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "description": "Create a React component for a user profile card",
    "language": "typescript"
  }'
```

---

## ⚠️ Common Issues

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Find what's using PostgreSQL port
netstat -ano | findstr :5432
```

### Database Connection Failed
1. Ensure PostgreSQL is running
2. Check DATABASE_URL in `.env`
3. Verify credentials: `psql -U postgres -h localhost`

### Prisma Client Not Generated
```bash
npm run db:generate
```

### Missing Dependencies
```bash
npm install
```

---

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run all tests with coverage |
| `npm run lint` | Check code style |
| `npm run format` | Format code with Prettier |
| `npm run validate` | Validate environment setup |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run db:reset` | Reset database (⚠️ deletes all data) |

---

## 📚 Next Steps

1. **Read API Documentation:** [API_DOCS.md](./API_DOCS.md)
2. **Explore Features:** [README.md](./README.md)
3. **Install VS Code Extension:** See `vscode-extension/`
4. **Try Web Dashboard:** See `web-dashboard/`
5. **Install Chrome Extension:** See `chrome-extension/`

---

## 🆘 Getting Help

- **Issues:** https://github.com/sanes15-ai/mindhive/issues
- **Discussions:** https://github.com/sanes15-ai/mindhive/discussions
- **Security:** See [SECURITY.md](./SECURITY.md)

---

**Built by Abdur Rehman ([@sanes15-ai](https://github.com/sanes15-ai)) at Elexiz LLC**
