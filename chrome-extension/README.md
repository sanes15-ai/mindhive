# 🧠 Hive Mind Chrome Extension

Inject collective intelligence directly into GitHub, Stack Overflow, ChatGPT, and Claude.

## ✨ Features

### 🔍 GitHub Integration
- **Code Verification**: Automatic Nexus verification on all code blocks
- **Inline Warnings**: Visual indicators for potential issues
- **Alternative Suggestions**: Show better patterns from the collective
- **Confidence Scores**: See how many devs verified the code

### 📚 Stack Overflow Integration
- **Answer Quality**: Rate answers against global patterns
- **Better Alternatives**: Suggest proven solutions
- **Success Rates**: Show production success statistics

### 🤖 AI Chat Integration (ChatGPT & Claude)
- **Auto-Learning**: Capture all AI responses for collective learning
- **Verification**: Check AI suggestions with Nexus
- **Pattern Matching**: Find similar solutions in Hive Mind

### 🎨 Floating HUD
- Expandable brain icon in bottom-right
- Quick access to insights
- Real-time pattern updates
- Customizable position

## 🚀 Installation

### From Chrome Web Store
1. Visit [Chrome Web Store](#)
2. Click "Add to Chrome"
3. Sign in with your Hive Mind account

### From Source

```powershell
cd chrome-extension
npm install
npm run build
```

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `build/chrome-mv3-prod` folder

## ⚙️ Configuration

1. Click the Hive Mind icon in your browser toolbar
2. Sign in with your API token
3. Configure settings:
   - ✓ Enable Nexus Verification
   - ✓ Auto-Learn from AI Chats
   - ✓ Show Floating HUD

## 🔐 Privacy

- All code analysis is opt-in
- Patterns are anonymized before sharing
- No code is stored without permission
- Can be disabled per-site

## 📖 Usage

### GitHub
1. Browse any GitHub repository
2. Code blocks are automatically analyzed
3. Click warnings/info badges for details
4. View alternatives in side panel

### Stack Overflow
1. Visit any question
2. Answers are automatically rated
3. See collective insights
4. One-click to apply better solutions

### ChatGPT/Claude
1. Chat normally with AI
2. Hive Mind listens in background
3. Verifies all code suggestions
4. Offers proven alternatives

## 🛠️ Development

```powershell
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Package for distribution
npm run package
```

## 📦 Tech Stack

- **Framework**: Plasmo (Chrome Extension Framework)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **HTTP**: Axios
- **WebSocket**: Socket.IO Client

## 🔗 Permissions

- `storage` - Save settings and auth tokens
- `activeTab` - Inject content scripts
- `https://github.com/*` - GitHub integration
- `https://stackoverflow.com/*` - Stack Overflow integration
- `https://chat.openai.com/*` - ChatGPT integration
- `https://claude.ai/*` - Claude integration

## 🤝 Contributing

See main [CONTRIBUTING.md](../CONTRIBUTING.md)

## 📄 License

See [LICENSE](../LICENSE)

---

**Built with ❤️ for the Hive Mind ecosystem**
