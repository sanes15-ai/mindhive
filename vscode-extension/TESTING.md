# VS Code Extension - Testing Guide

## ✅ Setup Complete!

### Dependencies Installed:
- ✅ @types/vscode@^1.85.0
- ✅ axios@^1.6.2
- ✅ socket.io-client@^4.7.2
- ✅ zod@^3.22.4
- ✅ esbuild@^0.19.10
- ✅ TypeScript@^5.3.3

### Build Status:
- ✅ Extension compiled successfully (dist/extension.js - 374.2kb)
- ✅ Launch configuration created (.vscode/launch.json)
- ✅ Tasks configuration created (.vscode/tasks.json)

## 🚀 How to Test

### Option 1: Run in Extension Development Host (Recommended)
1. Open VS Code in the extension directory:
   ```bash
   cd vscode-extension
   code .
   ```

2. Press **F5** or go to Run & Debug (Ctrl+Shift+D)

3. Select "Run Extension" and click Start Debugging

4. A new VS Code window will open with the extension loaded

### Option 2: Manual Testing
1. Build the extension:
   ```bash
   npm run build
   ```

2. Install locally:
   ```bash
   npm run package
   code --install-extension hivemind-vscode-1.0.0.vsix
   ```

## 🧪 Features to Test

### Commands (Ctrl+Shift+P):
- `Hive Mind: Ask Hive Mind` - Open AI assistant
- `Hive Mind: Generate Code` - Generate code from description
- `Hive Mind: Verify with Nexus` - Verify code accuracy
- `Hive Mind: Optimize Selection` - Optimize selected code
- `Hive Mind: Fix Bug` - AI-powered bug fixing
- `Hive Mind: Show Global Insights` - View collective patterns
- `Hive Mind: Toggle Code Quality HUD` - Toggle HUD overlay
- `Hive Mind: Sign In` - Authenticate with backend
- `Hive Mind: Sign Out` - Sign out

### Sidebar Views:
- **Global Insights** - Real-time collective intelligence
- **AI Agents** - View agent status and activity
- **Security Alerts** - Security scan results

### Context Menu (Right-click in editor):
- Generate Code
- Verify with Nexus
- Optimize Selection
- Fix Bug

### Inline Features:
- **CodeLens** - Inline suggestions above functions
- **Hover Provider** - AI-powered hover information
- **Inline Completion** - Predictive code suggestions
- **Code Actions** - Quick fixes and refactoring

### Keybindings:
- `Ctrl+Shift+H` (Mac: Cmd+Shift+H) - Ask Hive Mind
- `Ctrl+Shift+G` (Mac: Cmd+Shift+G) - Generate Code
- `Ctrl+Shift+V` (Mac: Cmd+Shift+V) - Verify with Nexus

## 🔧 Configuration

Before testing, configure the extension:

1. Go to Settings (Ctrl+,)
2. Search for "Hive Mind"
3. Set:
   - **API URL:** `http://localhost:3000`
   - **Auto-verify:** true/false
   - **Show HUD:** true/false

Or create `.vscode/settings.json`:
```json
{
  "hivemind.apiUrl": "http://localhost:3000",
  "hivemind.autoVerify": true,
  "hivemind.showHUD": true,
  "hivemind.enablePredictions": true,
  "hivemind.enableRealTimeInsights": true
}
```

## 📝 Testing Checklist

- [ ] Extension loads without errors
- [ ] Sign in with test account (test@hivemind.com / test123)
- [ ] Generate code from prompt
- [ ] Verify code with NEXUS
- [ ] View global insights sidebar
- [ ] Check AI agents status
- [ ] Toggle HUD overlay
- [ ] Test inline completions
- [ ] Test hover provider
- [ ] Test CodeLens suggestions
- [ ] WebSocket connection established
- [ ] Real-time updates working

## 🐛 Known Issues

1. **Icon Missing:** Create a 128x128 icon.png in assets/ folder
2. **TypeScript Warnings:** Some implicit 'any' types (non-critical)
3. **First Load:** May take a few seconds to connect to backend

## 📊 Architecture

```
vscode-extension/
├── src/
│   ├── extension.ts              # Main entry point
│   ├── client/
│   │   └── HiveMindClient.ts     # API + WebSocket client
│   ├── auth/
│   │   └── AuthManager.ts        # Authentication
│   ├── commands/
│   │   └── CommandHandler.ts     # Command palette handlers
│   ├── hud/
│   │   └── HUDManager.ts         # Code quality overlay
│   ├── assistant/
│   │   └── PredictiveAssistant.ts # AI predictions
│   ├── views/
│   │   ├── InsightsProvider.ts   # Insights TreeView
│   │   ├── AgentsProvider.ts     # Agents TreeView
│   │   └── AlertsProvider.ts     # Alerts TreeView
│   └── providers/
│       ├── CodeLensProvider.ts   # Inline suggestions
│       ├── InlineCompletionProvider.ts # Completions
│       ├── HoverProvider.ts      # Hover information
│       └── CodeActionsProvider.ts # Quick fixes
├── dist/
│   └── extension.js              # Compiled bundle (374.2kb)
└── .vscode/
    ├── launch.json               # Debug configuration
    └── tasks.json                # Build tasks
```

## 🚀 Next Steps

1. **Test the Extension:** Press F5 to launch
2. **Monitor Console:** Check Extension Host for errors
3. **Test Features:** Try all commands and views
4. **Report Issues:** Document any bugs or improvements

## 📞 Backend Connection

- **API:** http://localhost:3000/api/v1
- **WebSocket:** ws://localhost:3000
- **Health Check:** http://localhost:3000/health

Make sure the backend is running before testing!

---

**Status:** ✅ Ready to test!
**Build:** ✅ Compiled successfully
**Dependencies:** ✅ All installed
