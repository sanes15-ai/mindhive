# MindHive Deployment Guide

## Deployment Options

MindHive supports multiple deployment strategies:

1. **Docker Compose** - Local development and small deployments
2. **Kubernetes** - Production-grade orchestration
3. **Cloud Platforms** - AWS, GCP, Azure
4. **Managed Services** - Railway, Render, DigitalOcean

## Prerequisites

### Required Services
- PostgreSQL 16+
- Redis 7+
- Node.js 20+ (if not using Docker)

### Required Environment Variables
```bash
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_HOST=redis-host
REDIS_PORT=6379
JWT_SECRET=your-secure-secret-key

# At least one AI provider
OPENAI_API_KEY=sk-...
# or ANTHROPIC_API_KEY, GOOGLE_API_KEY, etc.
```

## Docker Compose Deployment

### Quick Start

```bash
# Clone repository
git clone https://github.com/sanes15-ai/mindhive.git
cd mindhive

# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services Included

| Service | Port | Description |
|---------|------|-------------|
| backend | 3000 | MindHive API server |
| postgres | 5432 | PostgreSQL database |
| redis | 6379 | Redis cache |
| ollama | 11434 | Local AI models |
| prometheus | 9090 | Metrics collection |
| grafana | 3030 | Monitoring dashboards |

### Persistent Data

Data is stored in Docker volumes:
- `postgres_data` - Database data
- `redis_data` - Redis data
- `ollama_data` - AI model files

### Database Migrations

```bash
# Run migrations on first deployment
docker-compose exec backend npm run db:migrate

# Seed initial data
docker-compose exec backend npm run db:seed
```

### Scaling Services

```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3

# Use load balancer (nginx, traefik) for distribution
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured
- Helm 3+ (optional)

### Configuration Files

Located in `/k8s` directory:

```
k8s/
├── namespace.yaml
├── configmap.yaml
├── secrets.yaml
├── postgres.yaml
├── redis.yaml
├── backend-deployment.yaml
├── backend-service.yaml
└── ingress.yaml
```

### Deployment Steps

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets (edit with your values)
kubectl create secret generic mindhive-secrets \
  --from-literal=jwt-secret=your-secret \
  --from-literal=database-url=postgresql://... \
  --from-literal=openai-api-key=sk-... \
  -n mindhive

# Deploy database
kubectl apply -f k8s/postgres.yaml

# Deploy Redis
kubectl apply -f k8s/redis.yaml

# Deploy backend
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml

# Setup ingress
kubectl apply -f k8s/ingress.yaml
```

### Health Checks

```bash
# Check pod status
kubectl get pods -n mindhive

# Check logs
kubectl logs -f deployment/mindhive-backend -n mindhive

# Check services
kubectl get svc -n mindhive
```

### Scaling

```bash
# Scale backend pods
kubectl scale deployment mindhive-backend --replicas=5 -n mindhive

# Enable autoscaling
kubectl autoscale deployment mindhive-backend \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n mindhive
```

## Cloud Platform Deployment

### AWS (ECS/EKS)

**Option 1: ECS with Fargate**

```bash
# Build and push image
docker build -t mindhive:latest .
aws ecr get-login-password | docker login --username AWS --password-stdin <registry>
docker tag mindhive:latest <registry>/mindhive:latest
docker push <registry>/mindhive:latest

# Create ECS task definition
aws ecs register-task-definition --cli-input-json file://aws-task-def.json

# Create ECS service
aws ecs create-service --cluster mindhive --service-name mindhive-api --task-definition mindhive:1
```

**Option 2: EKS**

```bash
# Create EKS cluster
eksctl create cluster --name mindhive --region us-east-1

# Deploy using kubectl (see Kubernetes section)
kubectl apply -f k8s/
```

**Required AWS Services:**
- RDS for PostgreSQL
- ElastiCache for Redis
- ECS/EKS for containers
- ALB for load balancing
- S3 for static assets (optional)

### Google Cloud Platform (GKE)

```bash
# Create GKE cluster
gcloud container clusters create mindhive \
  --zone us-central1-a \
  --num-nodes 3

# Get credentials
gcloud container clusters get-credentials mindhive --zone us-central1-a

# Deploy
kubectl apply -f k8s/
```

**Required GCP Services:**
- Cloud SQL for PostgreSQL
- Memorystore for Redis
- GKE for containers
- Cloud Load Balancing

### Microsoft Azure (AKS)

```bash
# Create resource group
az group create --name mindhive-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group mindhive-rg \
  --name mindhive-cluster \
  --node-count 3 \
  --enable-managed-identity

# Get credentials
az aks get-credentials --resource-group mindhive-rg --name mindhive-cluster

# Deploy
kubectl apply -f k8s/
```

**Required Azure Services:**
- Azure Database for PostgreSQL
- Azure Cache for Redis
- AKS for containers
- Azure Load Balancer

## Managed Platform Deployment

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add services
railway add postgresql
railway add redis

# Deploy
railway up

# Set environment variables
railway variables set JWT_SECRET=your-secret
railway variables set OPENAI_API_KEY=sk-...
```

### Render

1. Create new Web Service
2. Connect GitHub repository
3. Configure:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Add PostgreSQL database
5. Add Redis database
6. Set environment variables

### DigitalOcean App Platform

1. Create new App
2. Connect GitHub repository
3. Add PostgreSQL database
4. Add Redis database
5. Configure environment variables
6. Deploy

## Database Setup

### PostgreSQL

```bash
# Create database
createdb mindhive

# Run migrations
npm run db:migrate

# Seed data (optional)
npm run db:seed

# Backup database
pg_dump mindhive > backup.sql

# Restore database
psql mindhive < backup.sql
```

### Redis

```bash
# No initial setup required
# Data is ephemeral (cache)

# Monitor Redis
redis-cli monitor

# Check memory usage
redis-cli info memory
```

## Monitoring & Logging

### Prometheus + Grafana

Included in Docker Compose setup:

- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3030 (admin/admin)

### Application Logs

```bash
# Docker Compose
docker-compose logs -f backend

# Kubernetes
kubectl logs -f deployment/mindhive-backend -n mindhive

# View specific container
docker logs -f <container-id>
```

### Metrics Endpoints

- Health Check: `GET /health`
- Metrics: `GET /metrics` (Prometheus format)

## SSL/TLS Configuration

### Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d api.mindhive.dev

# Auto-renewal
sudo certbot renew --dry-run
```

### Kubernetes Ingress with cert-manager

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f k8s/cert-issuer.yaml

# Ingress will automatically request certificate
```

## Performance Optimization

### Database

```sql
-- Add indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_patterns_language ON global_patterns(language);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM memories WHERE user_id = 'xxx';
```

### Caching

```javascript
// Redis caching strategy
const cacheKey = `user:${userId}:memories`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Fetch from DB and cache
const data = await prisma.memory.findMany(...);
await redis.setex(cacheKey, 3600, JSON.stringify(data));
return data;
```

### Load Balancing

- Use multiple backend instances
- Implement health checks
- Configure session affinity if needed
- Use CDN for static assets

## Backup Strategy

### Database Backups

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
pg_dump mindhive | gzip > /backups/mindhive_$DATE.sql.gz

# Keep last 30 days
find /backups -name "mindhive_*.sql.gz" -mtime +30 -delete
```

### Automated Backups

- AWS RDS automated backups
- GCP Cloud SQL automated backups
- Azure Database automated backups

### Backup Retention

- Daily: 7 days
- Weekly: 4 weeks
- Monthly: 12 months

## Security Checklist

- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Set secure environment variables
- [ ] Enable rate limiting
- [ ] Keep dependencies updated
- [ ] Use secrets management (AWS Secrets Manager, etc.)
- [ ] Enable database encryption at rest
- [ ] Use VPC/private networks
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Regular security scans

## Troubleshooting

### Database Connection Issues

```bash
# Check connection
psql -h host -U user -d database

# Verify DATABASE_URL format
postgresql://user:password@host:5432/database?schema=public
```

### Redis Connection Issues

```bash
# Test connection
redis-cli -h host -p 6379 ping

# Should return: PONG
```

### High Memory Usage

```bash
# Check Node.js memory
node --max-old-space-size=4096 dist/index.js

# Monitor in Docker
docker stats
```

### Slow Queries

```bash
# Enable query logging in PostgreSQL
ALTER DATABASE mindhive SET log_statement = 'all';

# View slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
```

## Rollback Strategy

### Docker Compose

```bash
# Tag current version
docker tag mindhive:latest mindhive:backup

# Deploy new version
docker-compose up -d

# Rollback if needed
docker tag mindhive:backup mindhive:latest
docker-compose up -d
```

### Kubernetes

```bash
# View deployment history
kubectl rollout history deployment/mindhive-backend -n mindhive

# Rollback to previous version
kubectl rollout undo deployment/mindhive-backend -n mindhive

# Rollback to specific revision
kubectl rollout undo deployment/mindhive-backend --to-revision=2 -n mindhive
```

## Support

For deployment issues:
- GitHub Issues: https://github.com/sanes15-ai/mindhive/issues
- Documentation: https://github.com/sanes15-ai/mindhive/docs
- Discussions: https://github.com/sanes15-ai/mindhive/discussions
