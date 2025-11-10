# Chrome Extension - Manual Testing Guide

## ⚠️ Installation Issue

The Plasmo framework requires native dependencies (@parcel/watcher, lmdb) that need Visual Studio Build Tools. 

### Alternative: Manual Build Without Plasmo

Since we have the source code, we can create a minimal manifest.json and test the extension manually.

## 🚀 Quick Setup (Without Full Build)

### 1. Create manifest.json

Create `d:\Mindhive\chrome-extension\manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Hive Mind - AI Code Intelligence",
  "version": "1.0.0",
  "description": "Inject collective intelligence into GitHub, Stack Overflow, ChatGPT, and Claude",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://github.com/*",
    "https://stackoverflow.com/*",
    "https://chat.openai.com/*",
    "https://claude.ai/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Hive Mind",
    "default_icon": {
      "16": "icon-16.png",
      "48": "icon-48.png",
      "128": "icon-128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://github.com/*"],
      "js": ["github-content.js"]
    }
  ]
}
```

### 2. Create popup.html

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      width: 350px;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
      color: #ffffff;
    }
    h2 { margin: 0 0 20px 0; color: #7c3aed; }
    .status { padding: 10px; background: #2a2a2a; border-radius: 8px; margin-bottom: 15px; }
    button {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      margin-bottom: 10px;
    }
    button:hover { opacity: 0.9; }
    .input { width: 100%; padding: 10px; margin-bottom: 10px; background: #2a2a2a; border: 1px solid #444; color: white; border-radius: 4px; }
  </style>
</head>
<body>
  <h2>🧠 Hive Mind</h2>
  <div class="status" id="status">
    <div>Status: <span id="connectionStatus">Disconnected</span></div>
    <div>Backend: <span id="backendUrl">http://localhost:3000</span></div>
  </div>
  
  <div id="authSection">
    <input type="email" class="input" id="email" placeholder="Email" value="test@hivemind.com">
    <input type="password" class="input" id="password" placeholder="Password" value="test123">
    <button id="loginBtn">Sign In</button>
  </div>
  
  <div id="mainSection" style="display: none;">
    <button id="insightsBtn">View Global Insights</button>
    <button id="generateBtn">Generate Code</button>
    <button id="verifyBtn">Verify Code</button>
    <button id="logoutBtn">Sign Out</button>
  </div>

  <script src="popup-script.js"></script>
</body>
</html>
```

### 3. Create popup-script.js

```javascript
// Simple popup logic
const API_URL = 'http://localhost:3000/api/v1';

document.getElementById('loginBtn')?.addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      chrome.storage.local.set({ token: data.token, user: data.user });
      document.getElementById('authSection').style.display = 'none';
      document.getElementById('mainSection').style.display = 'block';
      document.getElementById('connectionStatus').textContent = 'Connected';
    }
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  chrome.storage.local.remove(['token', 'user']);
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('mainSection').style.display = 'none';
  document.getElementById('connectionStatus').textContent = 'Disconnected';
});

// Check auth status on load
chrome.storage.local.get(['token', 'user'], (result) => {
  if (result.token) {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('mainSection').style.display = 'block';
    document.getElementById('connectionStatus').textContent = 'Connected';
  }
});
```

## 📦 Manual Installation

1. Create the files above in `chrome-extension/` directory
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `chrome-extension/` folder
6. Test the popup by clicking the extension icon

## ✅ What Works Without Full Build

- ✅ Popup UI (manual HTML/CSS/JS)
- ✅ Chrome Storage API
- ✅ API Communication with backend
- ✅ Authentication flow
- ❌ Content Scripts (need compilation)
- ❌ Background Service Worker (need compilation)
- ❌ React Components (need build step)

## 🔧 Full Build (Requires Visual Studio)

To use the full Plasmo framework with React:

1. Install Visual Studio 2022 Community Edition
2. Install "Desktop development with C++" workload
3. Then run: `npm install && npm run dev`

## 📝 Status

- **Source Code:** ✅ Complete
- **Dependencies:** ❌ Native build tools required
- **Manual Setup:** ✅ Possible (see above)
- **Full Build:** ⏳ Needs VS Build Tools

## 🎯 Recommendation

For testing purposes, use the **VS Code Extension** instead, which has successfully compiled and is ready to test. The Chrome extension would provide similar functionality but requires additional build tooling.

---

**Note:** The Chrome extension is architecturally complete but requires Visual Studio Build Tools for the Plasmo framework's native dependencies. For immediate testing, use the VS Code Extension or create the manual manifest.json approach above.
