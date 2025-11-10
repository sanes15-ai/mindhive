# 🧠 Hive Mind Web Dashboard

The ultimate collective intelligence dashboard built with Next.js 14, React 18, and Tailwind CSS.

## ✨ Features

### 📊 Analytics & Insights
- **Global Intelligence Explorer** - Browse 10M+ verified code patterns
- **Hive Feed** - Real-time collective insights and trends
- **Team Analytics** - Productivity, velocity, and technical debt tracking
- **Personal AI Dashboard** - Track your code evolution and style

### 💼 Enterprise Features
- **Code Pattern Marketplace** - Buy and sell verified patterns
- **Executive Dashboard** - ROI, risk assessment, and metrics
- **Knowledge Maps** - Visualize team expertise and risks

### 🎨 Design System
- **Dark Glassmorphism UI** - Modern, sleek, and professional
- **Framer Motion Animations** - Smooth micro-interactions
- **Responsive Layouts** - Works on all devices
- **shadcn/ui Components** - Accessible and customizable

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

```powershell
cd web-dashboard
npm install
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

### Development

```powershell
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

### Production Build

```powershell
npm run build
npm start
```

## 📂 Project Structure

```
web-dashboard/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── dashboard/         # Main dashboard
│   │   ├── explore/           # Pattern explorer
│   │   ├── analytics/         # Analytics views
│   │   └── marketplace/       # Pattern marketplace
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   └── charts/            # Recharts wrappers
│   ├── lib/
│   │   ├── api.ts             # API client
│   │   └── utils.ts           # Utilities
│   └── store/
│       ├── authStore.ts       # Authentication state
│       ├── websocketStore.ts  # WebSocket management
│       └── dataStore.ts       # Data caching
├── public/                     # Static assets
└── package.json
```

## 🎯 Key Pages

### Landing Page (`/`)
- Hero section with animated background
- Feature showcase
- CTA buttons

### Dashboard (`/dashboard`)
- Real-time metrics
- Agent status
- Recent insights
- Quick actions

### Intelligence Explorer (`/explore`)
- Pattern search
- Filtering by language, tags, success rate
- Usage statistics
- Verification status

### Team Analytics (`/analytics/team`)
- Velocity charts
- Technical debt trends
- Knowledge distribution
- Risk assessment

### Marketplace (`/marketplace`)
- Browse patterns
- Purchase verified solutions
- Sell your patterns
- Revenue tracking

## 🔌 API Integration

All components use the centralized API client:

```typescript
import { apiClient } from '@/lib/api';

// Fetch patterns
const patterns = await apiClient.getPatterns({ language: 'typescript' });

// Generate code
const result = await apiClient.generateCode({
  prompt: 'Create a REST API',
  models: ['anthropic', 'openai']
});
```

## 🔄 Real-Time Updates

WebSocket integration for live data:

```typescript
import { useWebSocketStore } from '@/store/websocketStore';

const { socket, on } = useWebSocketStore();

// Listen for new patterns
on('pattern:new', (pattern) => {
  console.log('New pattern:', pattern);
});
```

## 🎨 Theming

Theme is configured in `tailwind.config.js` with CSS variables in `globals.css`.

To customize:

1. Edit CSS variables in `src/app/globals.css`
2. Update Tailwind config in `tailwind.config.js`
3. Components automatically adapt

## 📱 Responsive Design

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

All components are responsive by default.

## 🧪 Testing

```powershell
npm run test
```

## 🚀 Deployment

### Vercel (Recommended)

```powershell
vercel deploy
```

### Docker

```powershell
docker build -t hivemind-dashboard .
docker run -p 3001:3001 hivemind-dashboard
```

### Manual

```powershell
npm run build
npm start
```

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Framer Motion](https://www.framer.com/motion)
- [Recharts](https://recharts.org)

## 🤝 Contributing

See main [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Built with ❤️ for the Hive Mind ecosystem**
