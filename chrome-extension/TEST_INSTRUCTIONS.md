# Chrome Extension - Manual Testing Instructions

## ✅ Build Status: **SUCCESS**
- Build completed in 4.28 seconds
- All 5 content scripts compiled
- All icon sizes generated (16, 32, 48, 64, 128)
- Manifest properly configured

## 📦 Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select: `D:\Mindhive\chrome-extension\build\chrome-mv3-prod`
5. The Hive Mind extension should appear with the brain icon

## 🧪 Test Scenarios

### Test 1: Popup UI
**Steps:**
1. Click the Hive Mind icon in Chrome toolbar
2. Should see login screen with email/password fields
3. Try login (backend must be running on http://localhost:3000)

**Expected:**
- Clean popup UI (360×400px)
- Login form visible
- Purple gradient header

---

### Test 2: GitHub Integration
**Steps:**
1. Navigate to any GitHub repository (e.g., https://github.com/microsoft/vscode)
2. Open any file with code
3. Look for verification badges next to code blocks

**Expected:**
- ✅/⚠️/❌ badges appear on code
- Click badge shows analysis details
- Security warnings if issues found
- Alternative solutions displayed

---

### Test 3: Stack Overflow Integration
**Steps:**
1. Visit any Stack Overflow question (e.g., https://stackoverflow.com/questions/11227809)
2. Scroll through answers
3. Look for rating badges

**Expected:**
- Quality scores (0-100) on each answer
- Outdated pattern warnings (e.g., jQuery alerts)
- Security issue flags
- Modern alternative suggestions

---

### Test 4: ChatGPT Integration
**Steps:**
1. Visit https://chat.openai.com/ or https://chatgpt.com/
2. Start a conversation involving code
3. Ask ChatGPT to write code with potential issues (e.g., "write code using MD5 hashing")

**Expected:**
- Hallucination warnings appear for bad patterns
- ⚠️ Warning badges on problematic code
- Better alternatives suggested
- Auto-learning from conversation

---

### Test 5: Claude Integration
**Steps:**
1. Visit https://claude.ai/
2. Start coding conversation
3. Request code with security issues

**Expected:**
- Same verification as ChatGPT
- Warnings on dangerous patterns
- Alternative suggestions
- Verified code badges

---

### Test 6: Floating HUD
**Steps:**
1. Visit any website
2. Look for draggable brain icon (🧠) in bottom-right
3. Click to expand
4. Try dragging it around

**Expected:**
- Brain icon visible on all sites
- Draggable to any position
- Expands to show stats panel
- Displays: verified codes, issues found, patterns learned

---

## 🔍 Console Debugging

Open Chrome DevTools (F12) and check:
- **Console tab**: Look for any errors
- **Network tab**: Check API calls to http://localhost:3000
- **Application → Storage**: Check chrome.storage.local for auth tokens

## ⚠️ Known Requirements

1. **Backend must be running**: Start with `npm run dev` in main Mindhive directory
2. **API endpoint**: Extension expects http://localhost:3000/api/v1
3. **Authentication**: Login through popup before features work
4. **CORS**: Backend must allow Chrome extension origin

## 📊 Expected API Calls

- `POST /api/v1/auth/login` - Login
- `POST /api/v1/code/verify` - GitHub code verification
- `POST /api/v1/intelligence/rate-answer` - Stack Overflow rating
- `POST /api/v1/nexus/verify` - AI hallucination detection
- `GET /api/v1/analytics/quick-stats` - HUD stats
- `GET /api/v1/intelligence/patterns/recent` - Recent patterns

## ✨ Success Criteria

- [ ] Extension installs without errors
- [ ] Popup opens and displays correctly
- [ ] All 5 content scripts load on target sites
- [ ] API calls reach backend (check Network tab)
- [ ] Visual indicators appear (badges, warnings, HUD)
- [ ] No console errors
- [ ] Draggable HUD works smoothly
- [ ] Settings persist across sessions

## 🐛 Troubleshooting

**Extension won't load:**
- Check Developer mode is enabled
- Verify path: `D:\Mindhive\chrome-extension\build\chrome-mv3-prod`
- Check manifest.json exists in build directory

**No badges appearing:**
- Ensure backend is running
- Check console for API errors
- Verify authentication token in chrome.storage.local
- Check host_permissions in manifest

**API calls failing:**
- Start backend: `cd D:\Mindhive && npm run dev`
- Verify http://localhost:3000/health returns 200
- Check CORS configuration

**HUD not visible:**
- Check browser console for errors
- Verify floating-hud.js loaded (Sources tab)
- Try refreshing page
- Check if settings disabled it

---

## 📝 Test Results Template

```
Date: ___________
Tester: ___________

[ ] Test 1: Popup UI - PASS / FAIL
[ ] Test 2: GitHub Integration - PASS / FAIL  
[ ] Test 3: Stack Overflow Integration - PASS / FAIL
[ ] Test 4: ChatGPT Integration - PASS / FAIL
[ ] Test 5: Claude Integration - PASS / FAIL
[ ] Test 6: Floating HUD - PASS / FAIL

Issues Found:
1. ___________
2. ___________

Notes:
___________
```
