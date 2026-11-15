# GameHouse Production Deployment Guide

This guide explains how to deploy both the **Game Server** (persistent WebSocket service) and the **Web Frontend** (Next.js App Router).

---

## Architecture Overview

```
                      +-----------------------------+
                      |   Client Browsers (P1..P8)  |
                      +--------------+--------------+
                                     |
               HTTPS (Static/SSR)    |    WSS (Persistent WebSockets)
                                     |
           +-------------------------v-------------------------+
           |                                                   |
           v                                                   v
+--------------------------+                      +--------------------------+
|      Vercel / Cloudflare |                      |     Render / Railway     |
|      Next.js 14 Web App  |                      |  Node.js + Socket.IO     |
|      (apps/web)          |                      |  (apps/game-server)      |
+--------------------------+                      +--------------------------+
```

---

## 1. Game Server Deployment (Node.js + Socket.IO)

Because the game server maintains in-memory rooms and 20Hz real-time game simulation loops over persistent WebSockets, it **must run on a continuous container or VPS instance** (not serverless functions).

### Option A: Render.com (Recommended Free/Starter)
1. Fork or push the repo to GitHub.
2. In Render dashboard, click **New > Web Service**.
3. Connect your repository.
4. Set:
   - **Environment**: `Node`
   - **Root Directory**: Leave blank (monorepo root)
   - **Build Command**: `npm install && npm run build:shared && npm run build:server`
   - **Start Command**: `npm run start --workspace=@gamehouse/game-server`
5. Add Environment Variables:
   - `PORT`: `4000` (or leave default `$PORT`)
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: `https://your-frontend-app.vercel.app`
6. Click **Deploy**. Note your URL: `https://gamehouse-server.onrender.com`.

### Option B: Railway.app / Fly.io / VPS (Ubuntu)
For a Linux VPS with PM2:
```bash
git clone https://github.com/your-username/gamehouse.git
cd gamehouse
npm install
npm run build:shared
npm run build:server
npm install -g pm2
pm2 start apps/game-server/dist/server.js --name "gamehouse-server"
```

---

## 2. Web Frontend Deployment (Next.js on Vercel)

1. Go to [Vercel](https://vercel.com) and click **Add New Project**.
2. Select your repository.
3. Configure the Project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_GAME_SERVER_URL`: `https://your-gamehouse-server.onrender.com`
5. Click **Deploy**.

---

## 3. Verifying the Production Deployment

1. Visit your Vercel URL.
2. Open Browser DevTools (Network tab > WS filter).
3. Verify the WebSocket connects to your Game Server and receives `room:created` / `room:updated` packets.
4. Test room sharing by copying the invitation link into another browser or mobile device.
