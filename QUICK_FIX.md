# 🚨 QUICK FIX - WebSocket 404 Errors

## Problem
WebSocket connections failing with 404 errors at `/api/socketio/`

## Solution Applied ✅
Updated 3 files to support Railway's reverse proxy:
1. [next.config.ts](next.config.ts) - WebSocket headers
2. [server.js](server.js) - Enhanced Socket.IO config
3. [lib/socket/client.ts](lib/socket/client.ts) - Better connection handling

## Deploy Now 🚀

### Option 1: PowerShell Script (Recommended for Windows)
```powershell
.\deploy-websocket-fix.ps1
```

### Option 2: Manual Git Commands
```bash
git add next.config.ts server.js lib/socket/client.ts
git commit -m "Fix WebSocket 404 errors"
git push
```

## Update Railway Environment Variables ⚙️

**CRITICAL**: Update these in Railway dashboard:

```env
NEXTAUTH_URL=https://auction.sandipmaity.me
NEXT_PUBLIC_SOCKET_URL=https://auction.sandipmaity.me
NODE_ENV=production
```

## Verify Deployment ✓

1. **Railway Logs** - Look for:
   ```
   ✅ Socket.IO server running on ws://0.0.0.0:3000/api/socketio
   ```

2. **Browser Console** - Look for:
   ```
   ✅ Socket connected: <socket-id>
   ```

3. **DevTools Network** - WebSocket should show:
   ```
   Status: 101 Switching Protocols
   ```

## Still Not Working? 🔧

1. Check Railway logs for errors
2. Verify environment variables are saved
3. Ensure start command is: `npm run start` (not `next start`)
4. Check [WEBSOCKET_DEPLOYMENT.md](WEBSOCKET_DEPLOYMENT.md) for detailed troubleshooting

## Files Changed
- ✅ [next.config.ts](next.config.ts)
- ✅ [server.js](server.js)
- ✅ [lib/socket/client.ts](lib/socket/client.ts)
- 📄 [WEBSOCKET_FIX_SUMMARY.md](WEBSOCKET_FIX_SUMMARY.md) - Full details
- 📄 [WEBSOCKET_DEPLOYMENT.md](WEBSOCKET_DEPLOYMENT.md) - Deployment guide

---
**Build Status**: ✅ Compiled successfully  
**Ready to Deploy**: YES  
**Estimated Fix Time**: 5-10 minutes after deployment
