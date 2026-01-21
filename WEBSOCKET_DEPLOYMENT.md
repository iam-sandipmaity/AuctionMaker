# WebSocket Deployment Guide

## Issue: WebSocket 404 Errors in Production

If you're seeing errors like:
```
WebSocket connection to 'wss://auction.sandipmaity.me/api/socketio/?EIO=4&transport=websocket' failed
Failed to load resource: the server responded with a status of 404
```

This means the WebSocket connections are not being properly handled by your deployment platform.

## Root Cause

In production, especially on platforms like Railway, Render, or Vercel, WebSocket connections need special configuration because:

1. **Reverse Proxy**: Your app sits behind a reverse proxy that needs to properly forward WebSocket upgrade requests
2. **Custom Server**: Next.js needs to run with a custom server (server.js) to handle WebSocket connections
3. **Path Configuration**: The WebSocket path must match between client and server

## Solution Applied

### 1. Enhanced server.js Configuration ✅

Updated [server.js](server.js#L315) with:
- Proper CORS settings for proxies
- `allowRequest` callback to accept all origins through proxy
- `handlePreflightRequest` for OPTIONS requests
- Better WebSocket upgrade timeout settings
- Support for both websocket and polling transports

### 2. Updated next.config.ts ✅

Added headers configuration to ensure proper CORS for WebSocket endpoints.

### 3. Enhanced Client Configuration ✅

Updated [lib/socket/client.ts](lib/socket/client.ts#L11) with:
- Better transport negotiation
- Query parameters for debugging
- Extra headers for proxy support
- Proper upgrade handling

## Railway-Specific Configuration

### Required Environment Variables

Ensure these are set in your Railway project:

```env
NODE_ENV=production
PORT=3000
NEXTAUTH_URL=https://auction.sandipmaity.me
```

### Start Command

Your Railway start command should be:
```bash
npm run start
```

Which executes: `NODE_ENV=production node server.js`

### Important: Custom Server Requirement

❗ **Your app MUST use the custom server** (`server.js`) for WebSocket to work. Railway should:
1. Run `npm run build` during build phase
2. Run `npm run start` to start the custom server

### Railway Service Configuration

In Railway dashboard:
1. Go to your service settings
2. Under "Deploy", ensure:
   - Build Command: `npm run build`
   - Start Command: `npm run start`
3. Under "Networking":
   - Enable public networking
   - Custom domain should be properly configured

## Debugging WebSocket Issues

### Check if Custom Server is Running

Look for these logs in Railway logs:
```
> Ready on http://0.0.0.0:3000
> Socket.IO server running on ws://0.0.0.0:3000/api/socketio
```

If you don't see these, the custom server isn't running.

### Check WebSocket Handshake

1. Open browser DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Look for requests to `/api/socketio/?EIO=4&transport=websocket`
4. Check the response:
   - ✅ Status 101 (Switching Protocols) = Success
   - ❌ Status 404 = Server not handling WebSocket path
   - ❌ Status 502/503 = Proxy configuration issue

### Common Issues

#### Issue 1: 404 on WebSocket Path
**Cause**: Custom server not running or path mismatch
**Solution**: 
- Verify `npm run start` runs `node server.js`
- Check server.js has `path: '/api/socketio'`
- Check client.ts has `path: '/api/socketio'`

#### Issue 2: Connection Timeout
**Cause**: Railway proxy not forwarding WebSocket upgrade
**Solution**:
- Ensure Railway networking is properly configured
- Check if custom domain SSL is working
- Try using Railway's generated domain first

#### Issue 3: CORS Errors
**Cause**: Strict CORS policy blocking connections
**Solution**: Already fixed in server.js with:
```javascript
cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
}
```

## Testing WebSocket Connection

### Local Testing
```bash
npm run dev
```
Open http://localhost:3000 and check browser console for:
```
✅ Socket connected: <socket-id>
📡 Socket <socket-id> joined auction:<auction-id>
```

### Production Testing

After deploying, open your production URL and check:

1. **Browser Console** - Should see:
   ```
   ✅ Socket connected: <socket-id>
   ```

2. **Network Tab** - Should see:
   - Initial polling requests to `/api/socketio/?EIO=4&transport=polling`
   - Upgrade to WebSocket at `/api/socketio/?EIO=4&transport=websocket`
   - Status 101 on WebSocket upgrade

## Railway Deployment Checklist

- [ ] Environment variables set (NODE_ENV, NEXTAUTH_URL, DATABASE_URL, etc.)
- [ ] Build command: `npm run build`
- [ ] Start command: `npm run start`
- [ ] Custom domain configured (if using)
- [ ] SSL certificate active on domain
- [ ] Public networking enabled
- [ ] Check logs for "Socket.IO server running" message
- [ ] Test WebSocket connection in browser DevTools

## Alternative: Polling-Only Mode (Last Resort)

If WebSocket absolutely won't work, you can force polling-only mode:

**In client.ts**, change:
```typescript
transports: ['polling'],  // Remove 'websocket'
```

⚠️ **Note**: Polling is less efficient than WebSocket but will work through any proxy.

## Support

If issues persist:
1. Check Railway logs for errors
2. Verify all environment variables are set
3. Test with Railway's generated domain first
4. Check if port 3000 is accessible
5. Ensure no other service is using the WebSocket path

## Files Modified

- [next.config.ts](next.config.ts) - Added WebSocket headers
- [server.js](server.js) - Enhanced Socket.IO configuration
- [lib/socket/client.ts](lib/socket/client.ts) - Improved client connection handling
