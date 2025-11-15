# 🚀 How to Run LUPIN with Arc Integration

## Quick Commands

### Terminal 1: Backend

```bash
cd /Users/arukanussipzhan/Downloads/Fortnite-valorant-lupin-minimalist/backend
uvicorn app.main:app --reload
```

**Expected output:**
```
INFO:     Will watch for changes in these directories: ['.../backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using StatReload
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

You'll see a warning: `Arc client not initialized: ARC_RPC_URL not configured`  
**This is normal** - Arc features work after deployment.

### Terminal 2: Frontend

```bash
cd /Users/arukanussipzhan/Downloads/Fortnite-valorant-lupin-minimalist/frontend
npm run dev
```

**Expected output:**
```
  VITE v7.2.2  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Open Browser

Navigate to: **http://localhost:5173**

---

## 🎯 What You'll See

1. **LUPIN Tab** - Chat with Lupin agent
2. **EXPLOIT TRACKER** - Browse PIE database
3. **TEST YOUR LLM** - Run safety tests
4. **ARC VAULT** ⭐ NEW - On-chain safety projects
5. **SETTINGS** - API keys and theme

---

## ⚠️ Troubleshooting

### Backend: "Address already in use"

**Problem**: Port 8000 is occupied

**Fix 1 - Kill the process:**
```bash
lsof -ti:8000 | xargs kill -9
```

**Fix 2 - Use different port:**
```bash
uvicorn app.main:app --reload --port 8001
```
(Update frontend API calls to use 8001)

### Frontend: "Missing script: dev"

**Problem**: Wrong directory

**Fix**: Make sure you're in the root `frontend/` directory:
```bash
# From project root
cd frontend
npm run dev

# NOT from backend/frontend!
```

### Frontend: "Module not found"

**Problem**: Dependencies not installed

**Fix**:
```bash
cd frontend
npm install
npm run dev
```

---

## 🔍 Verify Everything Works

### 1. Backend Health Check

```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy"}
```

### 2. Projects API

```bash
curl http://localhost:8000/api/projects/stats/summary
# Should return: {"total_projects": 0, "message": "0 projects registered"}
```

### 3. Frontend Loading

- Open http://localhost:5173
- Click "ARC VAULT" tab
- Should see: "No projects yet" (correct - no deployment yet)

---

## 🎨 Features Available Now (No Arc Deployment)

Even without deploying to Arc, you can use:

✅ **Lupin Chat** - Autonomous jailbreak agent  
✅ **Exploit Tracker** - Browse/search PIE database  
✅ **Model Testing** - Manual/automated safety tests  
✅ **Settings** - Configure API keys  

### Features After Arc Deployment

🔄 **Arc Vault** - Create projects, run tests, track on-chain  

---

## 📝 Quick Reference

### Backend Commands
```bash
# Start
cd backend
uvicorn app.main:app --reload

# Start on different port
uvicorn app.main:app --reload --port 8001

# Check logs
# (Logs appear in terminal)

# Stop
# Press Ctrl+C
```

### Frontend Commands
```bash
# Start development server
cd frontend
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Common Tasks
```bash
# Install all dependencies (first time)
cd backend && python3 -m pip install -r requirements.txt
cd frontend && npm install

# Update dependencies
cd backend && python3 -m pip install -r requirements.txt --upgrade
cd frontend && npm update

# Clean install (if issues)
cd frontend && rm -rf node_modules && npm install
```

---

## 🐛 Known Issues & Fixes

### "Arc client not initialized"

**Status**: Expected  
**Fix**: Deploy contract and set .env (see ARC_DEPLOYMENT.md)

### "Cannot connect to Arc RPC"

**Status**: Expected without .env  
**Fix**: All other features work, Arc features pending deployment

### TypeScript Build Warnings

**Status**: Fixed  
**Action**: Already cleaned up unused variables

---

## 📖 Full Documentation

For complete guides, see:

- `START_HERE.md` - Overview and entry point
- `QUICKSTART_ARC.md` - 5-minute quick start
- `ARC_DEPLOYMENT.md` - Deploy to Arc blockchain
- `ARC_INTEGRATION_README.md` - Architecture and API
- `ARC_CHECKLIST.md` - Implementation checklist

---

## ✅ Success Checklist

When both terminals show:

```
Terminal 1:
✅ INFO: Application startup complete.
✅ Arc client not initialized: ... (expected)

Terminal 2:
✅ VITE v7.2.2 ready
✅ Local: http://localhost:5173/
```

Then open http://localhost:5173 and you're good to go!

---

**Made with ❤️ by the CrakHaus**

