# 📖 HIVE MIND API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:3000/api/v1`

---

## 🔐 Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Register User
**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Developer"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Developer",
    "tier": "FREE",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

### Get Current User
**GET** `/auth/me` 🔒

Get authenticated user profile.

---

## 🧬 Code Generation

### Generate Code
**POST** `/code/generate` 🔒

Generate production-ready code from natural language description.

**Request Body:**
```json
{
  "description": "Create a REST API endpoint for user authentication with JWT",
  "language": "typescript",
  "framework": "express",
  "style": "functional",
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022"
}
```

**Parameters:**
- `description` (required): What to generate
- `language` (required): Programming language
- `framework` (optional): Framework to use
- `style` (optional): Coding style preference
- `provider` (optional): AI provider (openai, anthropic, google, grok, ollama)
- `model` (optional): Specific model to use

**Response:**
```json
{
  "code": "import express from 'express';\n...",
  "verification": {
    "isValid": true,
    "confidence": 0.95,
    "warnings": [],
    "source": "nexus-engine"
  },
  "model": "claude-3-5-sonnet-20241022",
  "provider": "anthropic",
  "usage": {
    "promptTokens": 150,
    "completionTokens": 500,
    "totalTokens": 650
  }
}
```

### Verify Code
**POST** `/code/verify` 🔒

Verify code with NEXUS anti-hallucination engine.

**Request Body:**
```json
{
  "code": "const result = await fetch('https://api.example.com/data');",
  "language": "javascript",
  "framework": "node"
}
```

**Response:**
```json
{
  "isValid": true,
  "confidence": 0.98,
  "source": "nexus-engine",
  "warnings": [],
  "metadata": {
    "packages": {
      "fetch": {
        "exists": true,
        "verified": true
      }
    }
  }
}
```

### Explain Code
**POST** `/code/explain` 🔒

Get detailed explanation of code functionality.

**Request Body:**
```json
{
  "code": "const factorial = (n) => n <= 1 ? 1 : n * factorial(n - 1);"
}
```

### Optimize Code
**POST** `/code/optimize` 🔒

Get optimized version of code with improvements.

**Request Body:**
```json
{
  "code": "for (let i = 0; i < array.length; i++) { ... }",
  "language": "javascript"
}
```

### Fix Code
**POST** `/code/fix` 🔒

Fix code errors and bugs.

**Request Body:**
```json
{
  "code": "const result = JSON.parse(response);",
  "error": "SyntaxError: Unexpected token",
  "language": "javascript"
}
```

### Generate Tests
**POST** `/code/tests` 🔒

Generate comprehensive unit tests.

**Request Body:**
```json
{
  "code": "function add(a, b) { return a + b; }",
  "language": "javascript",
  "framework": "jest"
}
```

---

## 🤖 AI Agents

### CodeGen Agent
**POST** `/agents/codegen` 🔒

Request autonomous code generation from CodeGen agent.

**Request Body:**
```json
{
  "description": "Build a complete user authentication system",
  "language": "typescript",
  "framework": "express",
  "style": "object-oriented"
}
```

**Response:**
```json
{
  "success": true,
  "output": {
    "code": "...",
    "verification": { ... },
    "model": "gpt-4-turbo-preview",
    "consensus": true
  },
  "confidence": 0.94,
  "executionTime": 5234
}
```

### Sentinel Agent (Bug Fix)
**POST** `/agents/sentinel` 🔒

Request bug detection and fixing from Sentinel agent.

**Request Body:**
```json
{
  "logs": "Error: Cannot read property 'id' of undefined",
  "code": "const userId = user.id;",
  "errorPattern": "undefined reference"
}
```

### Optimizer Agent
**POST** `/agents/optimizer` 🔒

Request code optimization from Optimizer agent.

**Request Body:**
```json
{
  "code": "...",
  "language": "python",
  "metrics": {
    "executionTime": 1500,
    "memoryUsage": 256
  }
}
```

### SecurityGuard Agent
**POST** `/agents/security` 🔒

Request security vulnerability scan from SecurityGuard agent.

**Request Body:**
```json
{
  "code": "const query = 'SELECT * FROM users WHERE id=' + userId;",
  "language": "javascript"
}
```

**Response:**
```json
{
  "success": true,
  "output": {
    "vulnerabilities": ["SQL injection vulnerability detected"],
    "analysis": "...",
    "riskLevel": "HIGH",
    "recommendations": [
      "Use parameterized queries",
      "Implement input validation"
    ]
  },
  "confidence": 0.95,
  "warnings": ["SQL injection vulnerability detected"]
}
```

### Oracle Agent (Predictions)
**POST** `/agents/oracle` 🔒

Get predictive insights and suggestions from Oracle agent.

**Request Body:**
```json
{
  "context": {
    "currentFile": "auth.ts",
    "recentFiles": ["user.model.ts", "database.ts"]
  },
  "history": [...],
  "currentCode": "..."
}
```

### Batch Agent Requests
**POST** `/agents/batch` 🔒

Queue multiple agent tasks at once.

**Request Body:**
```json
{
  "tasks": [
    {
      "type": "security",
      "input": { ... },
      "priority": 3
    },
    {
      "type": "optimizer",
      "input": { ... },
      "priority": 1
    }
  ]
}
```

---

## 🌍 Global Intelligence

### Get Global Patterns
**GET** `/intelligence/global-patterns`

Retrieve proven code patterns from the collective intelligence network.

**Query Parameters:**
- `language` (optional): Filter by language
- `framework` (optional): Filter by framework
- `category` (optional): Filter by category
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "patterns": [
    {
      "id": "uuid",
      "name": "Express REST API Setup",
      "description": "Production-ready Express.js REST API",
      "code": "...",
      "language": "typescript",
      "framework": "express",
      "category": "API",
      "tags": ["express", "rest", "api"],
      "usageCount": 15234,
      "successRate": 0.94,
      "confidenceScore": 0.96
    }
  ],
  "total": 1
}
```

### Get Pattern Details
**GET** `/intelligence/global-patterns/:id`

### Predict Success
**POST** `/intelligence/predict-success` 🔒

Predict production success probability of code.

**Request Body:**
```json
{
  "code": "...",
  "language": "typescript",
  "framework": "react",
  "context": { ... }
}
```

**Response:**
```json
{
  "probability": 0.87,
  "confidence": 0.9,
  "similarPatterns": 156,
  "recommendation": "PROCEED"
}
```

### Get Best Practices
**GET** `/intelligence/best-practices`

Get proven best practices for a language/framework.

**Query Parameters:**
- `language` (required)
- `framework` (optional)

### Get Trending
**GET** `/intelligence/trending`

Get trending patterns and technologies.

### Get Deprecations
**GET** `/intelligence/deprecations`

Get deprecated patterns and their alternatives.

### Verify Pattern
**POST** `/intelligence/verify-pattern/:patternId` 🔒

Submit pattern verification result.

**Request Body:**
```json
{
  "outcome": "SUCCESS",
  "notes": "Worked perfectly in production",
  "context": { ... }
}
```

### Get Insights
**GET** `/intelligence/insights` 🔒

Get collective intelligence insights.

---

## 📊 Analytics

### User Analytics
**GET** `/analytics/user` 🔒

Get personal analytics and metrics.

**Response:**
```json
{
  "analytics": {
    "totalSearches": 245,
    "totalGenerations": 89,
    "totalFixes": 34,
    "successRate": 0.92,
    "productivityScore": 0.87
  },
  "stats": {
    "totalActions": 368,
    "byType": {
      "CODE_GENERATION": 89,
      "ERROR_FIX": 34,
      "OPTIMIZATION": 56
    },
    "successRate": 0.92,
    "avgTimeSpent": 12500
  }
}
```

### Team Analytics
**GET** `/analytics/team/:teamId` 🔒

Get team-level analytics.

### Security Scans
**GET** `/analytics/security` 🔒

Get security scan history.

**Query Parameters:**
- `limit` (optional)
- `riskLevel` (optional): CRITICAL, HIGH, MEDIUM, LOW

### Agent Activity
**GET** `/analytics/agents` 🔒

Get AI agent activity logs.

### Self-Healing Incidents
**GET** `/analytics/self-healing` 🔒

Get self-healing incident history.

### Productivity Metrics
**GET** `/analytics/productivity` 🔒

Get productivity trends and insights.

---

## 👥 Teams

### Create Team
**POST** `/teams` 🔒 (Requires TEAM or ENTERPRISE tier)

**Request Body:**
```json
{
  "name": "Engineering Team",
  "slug": "engineering",
  "description": "Main engineering team"
}
```

### Get User's Teams
**GET** `/teams` 🔒

### Get Team Details
**GET** `/teams/:teamId` 🔒

### Invite Member
**POST** `/teams/:teamId/members` 🔒

**Request Body:**
```json
{
  "email": "member@example.com",
  "role": "MEMBER"
}
```

**Roles:** OWNER, ADMIN, MEMBER, VIEWER

### Remove Member
**DELETE** `/teams/:teamId/members/:userId` 🔒

### Get Knowledge Map
**GET** `/teams/:teamId/knowledge-map` 🔒

Get team knowledge map showing expertise distribution.

### Update Knowledge Map
**POST** `/teams/:teamId/knowledge-map` 🔒

**Request Body:**
```json
{
  "domain": "Authentication",
  "expertise": {
    "user-id-1": "expert",
    "user-id-2": "intermediate"
  },
  "riskLevel": "MEDIUM",
  "documentation": "...",
  "owners": ["user-id-1"]
}
```

---

## 🔄 WebSocket Events

Connect to `ws://localhost:3001?userId=YOUR_USER_ID`

### Subscribe to Events

**Global Patterns:**
```javascript
socket.emit('subscribe:global-patterns');
socket.on('pattern:new', (pattern) => { ... });
```

**Team Updates:**
```javascript
socket.emit('subscribe:team', 'team-id');
socket.on('code:updated', (data) => { ... });
```

**Agent Processing:**
```javascript
socket.emit('agent:request', { ... });
socket.on('agent:processing', (data) => { ... });
socket.on('agent:completed', (result) => { ... });
```

---

## ⚠️ Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "User not found",
    "stack": "..." // Only in development
  }
}
```

**Common Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## 🚀 Rate Limits

- **Default:** 100 requests per 15 minutes
- **Authentication:** 5 requests per 15 minutes
- **Read operations:** 100 requests per minute

---

## 💡 Usage Examples

See [QUICKSTART.md](QUICKSTART.md) for PowerShell examples and step-by-step guide.

---

## 📞 Support

- **Documentation:** README.md
- **Issues:** GitHub Issues
- **Email:** support@hivemind.dev
