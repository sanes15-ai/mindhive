# MindHive Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### 1. npm install fails

**Symptoms:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still failing, use legacy peer deps
npm install --legacy-peer-deps
```

#### 2. Prisma Client generation fails

**Symptoms:**
```
Error: Prisma schema not found
```

**Solutions:**
```bash
# Ensure schema exists
ls prisma/schema.prisma

# Generate client
npx prisma generate

# If database issues, check DATABASE_URL
echo $DATABASE_URL

# Reset if needed
npm run db:reset
```

### Database Issues

#### 1. Database connection refused

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL (Ubuntu/Debian)
sudo systemctl start postgresql

# Start PostgreSQL (macOS)
brew services start postgresql

# Check DATABASE_URL in .env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Test connection
psql -U postgres -h localhost
```

#### 2. Migration fails

**Symptoms:**
```
Error: Migration failed to apply
```

**Solutions:**
```bash
# Check migration status
npx prisma migrate status

# Reset database (⚠️ deletes data)
npm run db:reset

# Apply migrations manually
npx prisma migrate deploy

# Create new migration
npx prisma migrate dev --name fix_issue
```

#### 3. Prisma Client out of sync

**Symptoms:**
```
Error: Prisma Client is not generated
```

**Solutions:**
```bash
# Regenerate client
npm run db:generate

# If schema changed, create migration
npm run db:migrate

# Restart dev server
npm run dev
```

### Build & Runtime Issues

#### 1. TypeScript compilation errors

**Symptoms:**
```
error TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
```

**Solutions:**
```bash
# Check TypeScript version
npx tsc --version

# Clean build directory
rm -rf dist

# Rebuild
npm run build

# Check tsconfig.json is correct
cat tsconfig.json
```

#### 2. Module not found errors

**Symptoms:**
```
Error: Cannot find module '@/services/...'
```

**Solutions:**
```bash
# Install dependencies
npm install

# Check tsc-alias is working
npm run build

# Verify tsconfig paths
cat tsconfig.json | grep paths
```

#### 3. Port already in use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### AI Provider Issues

#### 1. OpenAI API errors

**Symptoms:**
```
Error: Incorrect API key provided
```

**Solutions:**
```bash
# Check API key format
echo $OPENAI_API_KEY
# Should start with sk-

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check billing
# Visit: https://platform.openai.com/account/billing
```

#### 2. Rate limit exceeded

**Symptoms:**
```
Error: Rate limit reached for requests
```

**Solutions:**
```bash
# Implement retry logic (already in code)
# Wait 60 seconds
sleep 60

# Use different provider
# Set in request: provider: 'anthropic'

# Upgrade API tier
# Visit provider dashboard
```

#### 3. AI response timeout

**Symptoms:**
```
Error: Request timeout after 30000ms
```

**Solutions:**
```bash
# Increase timeout in .env
AI_REQUEST_TIMEOUT=60000

# Check network connectivity
ping api.openai.com

# Try different provider
# NEXUS will fallback automatically
```

### Redis Issues

#### 1. Redis connection error

**Symptoms:**
```
Error: Redis connection to localhost:6379 failed
```

**Solutions:**
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Start Redis (Ubuntu/Debian)
sudo systemctl start redis

# Start Redis (macOS)
brew services start redis

# Start Redis (Docker)
docker run -d -p 6379:6379 redis:7-alpine

# Check .env configuration
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### 2. Redis memory issues

**Symptoms:**
```
Error: OOM command not allowed when used memory > 'maxmemory'
```

**Solutions:**
```bash
# Check memory usage
redis-cli info memory

# Increase max memory
redis-cli config set maxmemory 512mb

# Enable eviction policy
redis-cli config set maxmemory-policy allkeys-lru

# Clear cache
redis-cli FLUSHALL
```

### Docker Issues

#### 1. Docker build fails

**Symptoms:**
```
Error: failed to solve with frontend dockerfile.v0
```

**Solutions:**
```bash
# Check Docker version
docker --version

# Clean build cache
docker builder prune

# Rebuild without cache
docker build --no-cache -t mindhive .

# Check Dockerfile syntax
docker build --check .
```

#### 2. Container exits immediately

**Symptoms:**
```
Error: Container exited with code 1
```

**Solutions:**
```bash
# Check logs
docker logs <container-id>

# Run interactively
docker run -it mindhive sh

# Check environment variables
docker exec <container-id> env

# Verify database connection
docker exec <container-id> npm run validate
```

#### 3. Docker Compose issues

**Symptoms:**
```
Error: network mindhive_default not found
```

**Solutions:**
```bash
# Recreate network
docker-compose down
docker-compose up -d

# Clean everything
docker-compose down -v
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

### Authentication Issues

#### 1. JWT token invalid

**Symptoms:**
```
Error: jwt malformed
```

**Solutions:**
```bash
# Check JWT_SECRET is set
echo $JWT_SECRET

# Generate new secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env
JWT_SECRET=<new-secret>

# Restart server
npm run dev
```

#### 2. Unauthorized errors

**Symptoms:**
```
Error: 401 Unauthorized
```

**Solutions:**
```bash
# Check token in request
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/auth/me

# Verify token hasn't expired
# Default: 7 days (JWT_EXPIRY=7d)

# Login again to get new token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}'
```

### Testing Issues

#### 1. Tests fail to connect to database

**Symptoms:**
```
Error: Can't reach database server
```

**Solutions:**
```bash
# Set test database URL
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mindhive_test"

# Create test database
createdb mindhive_test

# Run migrations
npm run db:migrate

# Run tests
npm test
```

#### 2. Tests timeout

**Symptoms:**
```
Error: Timeout - Async callback was not invoked within timeout
```

**Solutions:**
```bash
# Increase Jest timeout
# In jest.config.js:
testTimeout: 30000

# Run specific test
npm test -- --testNamePattern="test name"

# Run with verbose output
npm test -- --verbose
```

### Performance Issues

#### 1. Slow API responses

**Symptoms:**
- Response times > 2 seconds
- High CPU usage

**Solutions:**
```bash
# Check database queries
# Enable query logging in Prisma

# Add database indexes
npx prisma studio
# Review slow queries

# Enable Redis caching
# Check REDIS_HOST is set

# Profile application
node --prof dist/index.js
```

#### 2. Memory leaks

**Symptoms:**
- Increasing memory usage over time
- Server crashes after hours

**Solutions:**
```bash
# Monitor memory
node --max-old-space-size=4096 dist/index.js

# Profile heap
node --inspect dist/index.js
# Open chrome://inspect

# Check for unclosed connections
# Review Prisma client usage
# Ensure proper cleanup in finally blocks
```

### Security Issues

#### 1. CORS errors

**Symptoms:**
```
Access to fetch blocked by CORS policy
```

**Solutions:**
```bash
# Update .env
ENABLE_CORS=true
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Restart server
npm run dev

# For development, allow all
ALLOWED_ORIGINS=*
```

#### 2. Rate limit errors

**Symptoms:**
```
Error: Too many requests
```

**Solutions:**
```bash
# Adjust rate limits in .env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200

# Implement retry logic
# Already handled in client code

# Use different API keys
# Rotate between multiple accounts
```

## Debugging Tips

### Enable Debug Logging

```bash
# Set log level
export LOG_LEVEL=debug

# Run server
npm run dev

# View logs
tail -f logs/combined.log
```

### Interactive Debugging

```bash
# VS Code launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Server",
  "program": "${workspaceFolder}/src/index.ts",
  "preLaunchTask": "tsc: build",
  "outFiles": ["${workspaceFolder}/dist/**/*.js"]
}
```

### Database Debugging

```bash
# Prisma Studio (GUI)
npm run db:studio

# View schema
npx prisma db pull

# Check migrations
npx prisma migrate status

# View raw SQL
npx prisma db execute --file query.sql
```

### Network Debugging

```bash
# Check API connectivity
curl -v http://localhost:3000/health

# Monitor requests
npm run dev | grep -i error

# Use httpie for better output
http GET localhost:3000/health
```

## Getting Help

If you're still stuck:

1. **Check Logs:**
   ```bash
   # Application logs
   tail -f logs/error.log
   
   # System logs
   journalctl -u mindhive
   ```

2. **Search Issues:**
   - GitHub Issues: https://github.com/sanes15-ai/mindhive/issues
   - Stack Overflow: [mindhive] tag

3. **Create Issue:**
   - Include error messages
   - Include configuration (redact secrets!)
   - Include steps to reproduce
   - Include environment details

4. **Community Support:**
   - GitHub Discussions: https://github.com/sanes15-ai/mindhive/discussions
   - Discord: (if available)

## Quick Reference

### Useful Commands

```bash
# Restart everything
npm run docker:down && npm run docker:up

# Reset database
npm run db:reset

# Run migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Build project
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Validate environment
npm run validate
```

### Environment Variables Checklist

- [ ] DATABASE_URL set correctly
- [ ] REDIS_HOST set correctly
- [ ] JWT_SECRET is random and secure
- [ ] At least one AI provider key set
- [ ] PORT available (default 3000)
- [ ] NODE_ENV set (development/production)

### Health Check Endpoints

```bash
# Server health
curl http://localhost:3000/health

# Database health
npm run validate

# Redis health
redis-cli ping
```
