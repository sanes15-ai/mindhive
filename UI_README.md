# 🎨 Hive Mind UI Architecture

**Complete Documentation for All UI Layers**

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [VS Code Extension](#vs-code-extension)
3. [Web Dashboard](#web-dashboard)
4. [Chrome Extension](#chrome-extension)
5. [Backend UI Integration](#backend-ui-integration)
6. [Shared Components](#shared-components)
7. [Deployment](#deployment)

---

## 🌟 Overview

The Hive Mind ecosystem includes **three complete UI layers** that provide seamless access to collective intelligence across different platforms:

### 🔧 VS Code Extension
- **Platform**: Visual Studio Code
- **Tech**: TypeScript, VS Code API, WebSocket
- **Purpose**: Real-time AI assistance inside the IDE

### 🌐 Web Dashboard
- **Platform**: Web Browser
- **Tech**: Next.js 14, React 18, Tailwind CSS
- **Purpose**: Analytics, exploration, and team management

### 🦾 Chrome Extension
- **Platform**: Chrome/Edge/Brave Browser
- **Tech**: Plasmo Framework, TypeScript
- **Purpose**: Inject intelligence into GitHub, Stack Overflow, AI chats

---

## 🔧 VS Code Extension

### 📍 Location
```
vscode-extension/
```

### 🚀 Features

#### 1. Command Palette Integration
- **Command**: `/@hivemind` or `Ctrl+Shift+H`
- **Actions**:
  - Ask Hive Mind
  - Generate Code
  - Verify with Nexus
  - Optimize Selection
  - Fix Bug
  - Show Global Insights

#### 2. Real-Time Overlays
- Inline intelligence displayed as CodeLens
- Hover tooltips with collective insights
- Success rate indicators next to functions
- Package popularity badges on imports

#### 3. Predictive Assistant
- Monitors your typing patterns
- Predicts what you'll need next
- Proactive suggestions:
  - "You'll need tests for this function"
  - "This package is deprecated"
  - "127K devs use a better approach"

#### 4. Self-Healing Panel
- **Location**: Sidebar "Self-Healing Alerts" view
- Displays security vulnerabilities
- One-click "Apply Fix" buttons
- Confidence scores for each fix

#### 5. Code Quality HUD
- **Location**: Status bar + inline decorations
- Metrics displayed:
  - Code quality score vs global average
  - Velocity indicator
  - Technical debt counter
  - Pattern match confidence

#### 6. Authentication
- OAuth2 flow via browser
- JWT token stored securely in VS Code secrets
- Automatic token refresh

#### 7. Settings
Configure via VS Code Settings UI (`Ctrl+,`):

```json
{
  "hivemind.apiUrl": "http://localhost:3000",
  "hivemind.wsUrl": "ws://localhost:3000",
  "hivemind.nexusStrictness": "high",
  "hivemind.showInlineInsights": true,
  "hivemind.predictiveMode": true,
  "hivemind.autoFix": false,
  "hivemind.preferredModels": ["anthropic", "openai"]
}
```

### 📂 File Structure

```
vscode-extension/
├── src/
│   ├── extension.ts               # Main activation entry point
│   ├── client/
│   │   └── HiveMindClient.ts      # API & WebSocket client
│   ├── auth/
│   │   └── AuthManager.ts         # OAuth2 authentication
│   ├── commands/
│   │   └── CommandHandler.ts      # All command implementations
│   ├── hud/
│   │   └── HUDManager.ts          # Status bar & decorations
│   ├── assistant/
│   │   └── PredictiveAssistant.ts # Predictive coding logic
│   ├── views/
│   │   ├── InsightsProvider.ts    # Global insights tree view
│   │   ├── AgentsProvider.ts      # Agent status tree view
│   │   └── AlertsProvider.ts      # Healing alerts tree view
│   └── providers/
│       ├── CodeLensProvider.ts    # Inline action buttons
│       ├── InlineCompletionProvider.ts # AI completions
│       ├── HoverProvider.ts       # Hover tooltips
│       └── CodeActionsProvider.ts # Quick fix suggestions
├── package.json                   # Extension manifest
├── tsconfig.json
└── README.md
```

### 🔌 API Integration

**HiveMindClient** provides unified access to backend:

```typescript
// Generate code
const result = await client.generateCode({
  prompt: "Create a REST API",
  language: "typescript",
  models: ["anthropic", "openai"]
});

// Verify code
const verification = await client.verifyCode(code, "typescript");

// Search patterns
const patterns = await client.searchPatterns("authentication");
```

### 🎯 Key Classes

#### `HiveMindClient`
- HTTP + WebSocket connection
- All API methods
- Event emitter for real-time updates

#### `AuthManager`
- OAuth2 flow
- Token storage in VS Code secrets
- Automatic refresh

#### `HUDManager`
- Status bar item
- Inline decorations
- Metric updates

#### `PredictiveAssistant`
- Document change listener
- Pattern analysis
- Proactive suggestions

### 🛠️ Development

```powershell
cd vscode-extension
npm install
npm run watch        # Development with hot reload
npm run compile      # TypeScript compilation
npm run package      # Package for distribution
```

### 📦 Installation

```powershell
# Install from .vsix file
code --install-extension hivemind-vscode-1.0.0.vsix
```

---

## 🌐 Web Dashboard

### 📍 Location
```
web-dashboard/
```

### 🚀 Features

#### 1. Global Intelligence Explorer (`/explore`)
- Search 10M+ code patterns
- Filter by:
  - Language
  - Success rate
  - Usage count
  - Verification status
  - Tags
- Real-time results
- Pattern details with:
  - Full code
  - Success metrics
  - User reviews
  - Alternative suggestions

#### 2. Hive Feed (`/feed`)
- Real-time WebSocket updates
- Trending patterns
- Deprecation alerts
- Best practices
- Community insights

#### 3. Team Analytics (`/analytics/team`)
- **Velocity Chart**: Story points over time
- **Technical Debt**: Trend analysis
- **Knowledge Distribution**: Heatmap of expertise
- **Risk Assessment**: Single points of failure
- **Productivity Metrics**: Per-developer stats

#### 4. Personal AI Dashboard (`/dashboard`)
- Your code evolution timeline
- Style consistency score
- AI usage statistics
- Memory bank (stored snippets)
- Learning progress

#### 5. Code Pattern Marketplace (`/marketplace`)
- Browse verified patterns
- Purchase premium solutions
- Sell your patterns
- Revenue tracking
- Download analytics

#### 6. Executive Dashboard (`/executive`)
- ROI calculator
- Cost savings analysis
- Team efficiency metrics
- Security posture
- Adoption rates

#### 7. Account & Preferences (`/settings`)
- Profile management
- Nexus strictness controls
- AI model preferences
- Privacy settings
- Billing & subscription

### 📂 File Structure

```
web-dashboard/
├── src/
│   ├── app/                        # Next.js 14 App Router
│   │   ├── (auth)/                 # Auth pages
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/              # Main dashboard
│   │   ├── explore/                # Pattern explorer
│   │   ├── feed/                   # Hive feed
│   │   ├── analytics/              # Analytics views
│   │   ├── marketplace/            # Marketplace
│   │   ├── executive/              # Executive dashboard
│   │   ├── settings/               # Settings pages
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Landing page
│   │   └── globals.css             # Global styles
│   ├── components/
│   │   ├── ui/                     # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── dashboard/              # Dashboard components
│   │   │   ├── MetricCard.tsx
│   │   │   ├── AgentStatusWidget.tsx
│   │   │   └── InsightsFeed.tsx
│   │   ├── charts/                 # Recharts wrappers
│   │   │   ├── VelocityChart.tsx
│   │   │   ├── TechDebtChart.tsx
│   │   │   └── HeatMap.tsx
│   │   └── providers.tsx           # Context providers
│   ├── lib/
│   │   ├── api.ts                  # API client
│   │   ├── utils.ts                # Utility functions
│   │   └── websocket.ts            # WebSocket client
│   └── store/
│       ├── authStore.ts            # Authentication state (Zustand)
│       ├── websocketStore.ts       # WebSocket management
│       └── dataStore.ts            # Data caching
├── public/                         # Static assets
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

### 🎨 Design System

#### **Dark Glassmorphism**
```css
.glassmorphism {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

#### **Theme Colors**
- **Primary**: Purple (`#9333ea`)
- **Secondary**: Blue (`#3b82f6`)
- **Success**: Green (`#4caf50`)
- **Warning**: Orange (`#ff9800`)
- **Danger**: Red (`#f44336`)

#### **Typography**
- **Font**: Inter (via Google Fonts)
- **Headings**: Bold, gradient text
- **Body**: Regular, high contrast

### 🔄 State Management

#### Zustand Stores

**authStore.ts**
```typescript
{
  user: User | null,
  token: string | null,
  isAuthenticated: boolean,
  login: (email, password) => Promise<void>,
  logout: () => void
}
```

**websocketStore.ts**
```typescript
{
  socket: Socket | null,
  isConnected: boolean,
  connect: (token) => void,
  disconnect: () => void,
  on: (event, handler) => void
}
```

### 🛠️ Development

```powershell
cd web-dashboard
npm install
npm run dev          # Development server (localhost:3001)
npm run build        # Production build
npm start            # Start production server
```

### 🚀 Deployment

#### Vercel (Recommended)
```powershell
vercel deploy
```

#### Docker
```powershell
docker build -t hivemind-dashboard .
docker run -p 3001:3001 hivemind-dashboard
```

---

## 🦾 Chrome Extension

### 📍 Location
```
chrome-extension/
```

### 🚀 Features

#### 1. GitHub Integration
- **Code Block Analysis**: Automatic Nexus verification
- **Visual Indicators**:
  - ⚠️ Warning overlays for issues
  - ✓ Verification badges for safe code
- **Side Panel**: Detailed results on click
- **Alternative Suggestions**: Better patterns from Hive

#### 2. Stack Overflow Integration
- **Answer Rating**: Compare against global patterns
- **Success Metrics**: Production success rates
- **Better Alternatives**: Suggest proven solutions
- **One-Click Copy**: Apply verified code

#### 3. ChatGPT/Claude Integration
- **Auto-Learning**: Capture all AI responses
- **Verification**: Check suggestions with Nexus
- **Pattern Matching**: Find similar in Hive Mind
- **Warnings**: Alert for hallucinations

#### 4. Floating HUD
- **Brain Icon**: Bottom-right corner
- **Expandable**: Click to show insights
- **Notifications**: New patterns, alerts
- **Quick Actions**: Verify, search, settings

### 📂 File Structure

```
chrome-extension/
├── lib/
│   ├── config.ts                  # Extension configuration
│   └── api.ts                     # API client
├── contents/
│   ├── github.ts                  # GitHub content script
│   ├── stackoverflow.ts           # Stack Overflow script
│   └── ai-chat.ts                 # ChatGPT/Claude script
├── popup.tsx                      # Extension popup UI
├── background.ts                  # Background service worker
├── package.json
├── tsconfig.json
└── README.md
```

### 🔌 Content Scripts

#### GitHub (`contents/github.ts`)
- Detects code blocks
- Calls Nexus API
- Injects overlays
- Shows detail panel

#### Stack Overflow (`contents/stackoverflow.ts`)
- Parses answers
- Rates quality
- Suggests alternatives
- Tracks clicks

#### AI Chat (`contents/ai-chat.ts`)
- Listens to responses
- Extracts code
- Verifies with Nexus
- Logs to backend

### 🎨 UI Components

#### Popup (`popup.tsx`)
- Sign in/out
- Toggle Nexus verification
- Enable/disable auto-learning
- Quick stats

#### Side Panel
- Verification results
- Warnings & suggestions
- Metadata display
- Close button

### 🛠️ Development

```powershell
cd chrome-extension
npm install
npm run dev          # Development with hot reload
npm run build        # Production build
npm run package      # Create .zip for store
```

### 📦 Installation

#### From Chrome Web Store
1. Visit Chrome Web Store
2. Search "Hive Mind"
3. Click "Add to Chrome"

#### From Source
1. Run `npm run build`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `build/chrome-mv3-prod` folder

---

## 🔗 Backend UI Integration

### 📍 Location
```
src/routes/ui.ts
prisma/schema.prisma (UISession, UIEvent models)
```

### 🗄️ Database Schema

#### UISession Model
```prisma
model UISession {
  id         String      @id @default(uuid())
  userId     String?
  sessionId  String      @unique
  platform   UIPlatform  // VSCODE | WEB_DASHBOARD | CHROME_EXTENSION
  startedAt  DateTime    @default(now())
  endedAt    DateTime?
  events     UIEvent[]
  metadata   Json?
}
```

#### UIEvent Model
```prisma
model UIEvent {
  id         String      @id @default(uuid())
  sessionId  String
  session    UISession   @relation(fields: [sessionId], references: [id])
  eventType  String      // e.g., "code-generated", "pattern-searched"
  eventData  Json?
  timestamp  DateTime    @default(now())
  url        String?
}
```

### 🔌 API Endpoints

#### POST /api/v1/ui/events
Log UI interaction:
```json
{
  "platform": "VSCODE",
  "eventType": "code-generated",
  "eventData": {
    "prompt": "Create REST API",
    "language": "typescript"
  },
  "sessionId": "optional-session-id"
}
```

#### GET /api/v1/ui/sessions
Get user sessions:
```
Query params:
- platform: VSCODE | WEB_DASHBOARD | CHROME_EXTENSION
- limit: number (default: 10)
```

#### GET /api/v1/ui/analytics
Get UI analytics:
```
Query params:
- days: number (default: 30)

Returns:
- sessionsByPlatform
- eventsByType
- totalSessionTime (minutes)
- totalSessions
- totalEvents
```

#### POST /api/v1/ui/sessions/:sessionId/end
End active session.

### 📊 Analytics Use Cases

1. **Platform Adoption**: Which UI is most used?
2. **Feature Usage**: What commands are popular?
3. **User Journeys**: How do users navigate?
4. **Performance**: Session durations, event frequencies
5. **A/B Testing**: Compare feature variants

---

## 🧩 Shared Components

### 🎨 UI Component Library (shadcn/ui)

All UI layers share a consistent design language based on **shadcn/ui** + **Tailwind CSS**.

#### Core Components
- **Button**: Primary actions
- **Card**: Content containers
- **Dialog**: Modals
- **Dropdown**: Menus
- **Tabs**: Navigation
- **Toast**: Notifications
- **Tooltip**: Help text

#### Custom Components
- **MetricCard**: Display stats with icons
- **CodeBlock**: Syntax-highlighted code
- **AgentStatusWidget**: Live agent monitoring
- **PatternCard**: Display code patterns
- **ChartWrapper**: Recharts integration

### 🔄 WebSocket Events

All UIs listen to the same WebSocket events:

```typescript
// New pattern discovered
socket.on('pattern:new', (pattern) => { ... });

// Agent status update
socket.on('agent:status', (status) => { ... });

// Security alert
socket.on('alert:new', (alert) => { ... });

// Collective insight
socket.on('insight:new', (insight) => { ... });
```

### 🔐 Authentication

All UIs use the same JWT-based auth:

1. User logs in via VS Code / Web / Chrome
2. Backend returns JWT token
3. Token stored securely:
   - **VS Code**: secrets API
   - **Web**: localStorage + httpOnly cookie
   - **Chrome**: chrome.storage.sync
4. Token sent in `Authorization: Bearer <token>` header
5. WebSocket authenticates with token on connect

---

## 🚀 Deployment

### VS Code Extension

#### Marketplace Publish
```powershell
cd vscode-extension
npm run package      # Creates .vsix file
vsce publish         # Publishes to marketplace
```

#### Manual Install
```powershell
code --install-extension hivemind-vscode-1.0.0.vsix
```

### Web Dashboard

#### Vercel
```powershell
cd web-dashboard
vercel deploy --prod
```

#### Docker
```dockerfile
# web-dashboard/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

```powershell
docker build -t hivemind-dashboard .
docker push your-registry/hivemind-dashboard:latest
```

### Chrome Extension

#### Chrome Web Store
1. Create developer account
2. Package extension: `npm run package`
3. Upload .zip to store
4. Submit for review

#### Manual Install
1. Build: `npm run build`
2. Load unpacked from `build/chrome-mv3-prod`

---

## 📊 Monitoring & Analytics

### Backend Metrics (Prometheus)

```yaml
# Tracked metrics
- ui_events_total (counter by platform, event_type)
- ui_sessions_active (gauge by platform)
- ui_session_duration_seconds (histogram)
- ui_api_requests_total (counter by endpoint)
- ui_websocket_connections (gauge by platform)
```

### Grafana Dashboards

1. **UI Overview**
   - Active sessions by platform
   - Events per second
   - Session duration distribution

2. **Platform Breakdown**
   - VS Code usage trends
   - Web dashboard page views
   - Chrome extension interactions

3. **User Journey**
   - Most common event sequences
   - Drop-off points
   - Feature adoption rates

---

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# API
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/hivemind

# Redis
REDIS_URL=redis://localhost:6379

# AI Models
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# WebSocket
WS_PORT=3000

# CORS
ALLOWED_ORIGINS=http://localhost:3001,vscode://hivemind.hivemind-vscode

# Security
JWT_SECRET=your-secret-key
```

#### Web Dashboard (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

#### VS Code Extension (settings.json)
```json
{
  "hivemind.apiUrl": "http://localhost:3000",
  "hivemind.wsUrl": "ws://localhost:3000"
}
```

#### Chrome Extension (chrome.storage)
```typescript
{
  apiUrl: "http://localhost:3000",
  wsUrl: "ws://localhost:3000",
  token: "jwt-token",
  nexusEnabled: true,
  autoLearn: true
}
```

---

## 🧪 Testing

### VS Code Extension
```powershell
cd vscode-extension
npm run compile
# Open in VS Code Extension Development Host (F5)
```

### Web Dashboard
```powershell
cd web-dashboard
npm run test
npm run test:e2e
```

### Chrome Extension
```powershell
cd chrome-extension
npm run build
# Load unpacked in chrome://extensions/
# Test on github.com, stackoverflow.com, etc.
```

---

## 📚 Additional Resources

- **API Documentation**: `/API_DOCS.md`
- **Architecture Overview**: `/STRUCTURE.md`
- **Backend Setup**: `/QUICKSTART.md`
- **Contributing Guide**: `/CONTRIBUTING.md`

---

## 🤝 Support

- **Issues**: [GitHub Issues](https://github.com/hivemind/issues)
- **Discussions**: [GitHub Discussions](https://github.com/hivemind/discussions)
- **Email**: support@hivemind.dev
- **Discord**: [Join our community](https://discord.gg/hivemind)

---

**Built with ❤️ by the Hive Mind team**  
**October 11, 2025**
