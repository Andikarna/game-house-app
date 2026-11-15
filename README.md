# 🎮 GameHouse — Online Multiplayer Party Game Platform

> **Tagline:** Your Online Party Game Platform  
> **Brand Message:** Play Together. Compete Together.

**GameHouse** is a modern, real-time online multiplayer party game platform built for the browser. Featuring a unified lobby, room code system, invitation sharing, and server-authoritative multiplayer engine.

The flagship first mini-game is **Panjat Pinang Battle** — an Indonesian 17 August festival game where up to 8 players race up a slippery greased areca nut palm trunk (*batang pinang*) to claim prizes at the summit.

---

## 🌟 Key Features

### 1. Platform & Ecosystem
- **Instant Room Creation:** Choose nickname, avatar, room name, game mode, and capacity (2–8 players). Generates human-friendly codes like `GH-48291`.
- **One-Click Shareable Invitations:** Direct link `/room/GH-XXXXX` joins friends immediately without typing codes.
- **Modern Indie Gaming UI:** Dark gaming aesthetic (`#0B0E17`), vibrant purple and electric blue accents, energetic orange competitive glows, and smooth transitions.
- **Full Host Controls & Host Migration:** Host controls game settings, kick players, and triggers starts. If host disconnects, leadership migrates seamlessly.
- **Unified Modular Game Engine:** Built with a pluggable `GameModule` interface allowing new mini-games (e.g. *Obstacle Race*, *Card Battle*, *Mini Battle Arena*) to be added without rewriting lobby, socket transport, or session management.

### 2. Panjat Pinang Battle (First Game)
- **Authentic Indonesian 17 Agustus Atmosphere:** Tall greased areca palm trunk (*batang pinang*), celebratory bunting flags, animated cheering spectators waving *Merah Putih* flags, and prize wheels laden with bicycles, radios, and pans.
- **Server-Authoritative Physics (20 Hz):** Server computes stamina depletion, grease drift, slipping thresholds, stun timers, and trap collisions.
- **6 Strategic Skills:**
  1. 🛡️ **Iron Grip:** Immune to slipping and boosts grip strength for 5s (CD: 15s).
  2. ⚡ **Super Climb:** 2x climbing speed burst (CD: 20s).
  3. 🔄 **Quick Recovery:** Restores +30 Stamina and cleanses stun / daze instantly (CD: 25s).
  4. 🍌 **Banana Trap:** Drops a slippery banana peel behind you; opponents crossing it lose balance (CD: 25s).
  5. 💨 **Wind Boost:** Updraft lifts you +12% height instantly (CD: 30s).
  6. 👑 **Legendary Climber (Ultimate):** Requires 100% energy. Super golden aura, maximum grip, perfect balance, and +80% climb speed for 6s (CD: 40s).
- **3 Game Modes:**
  - 🏁 **Classic Race:** First climber to reach 100% height wins. (Max 3 minutes)
  - 🔥 **Survival Climb:** Pole grease intensifies over time. Highest climber when time expires wins.
  - ⚡ **Skill Battle:** 30% cooldown reduction and maximum tactical sabotage.
- **Responsive Controls:**
  - **Desktop:** `W` / `Up` (Climb), `S` / `Down` (Descend), `A` / `Left` (Balance Left), `D` / `Right` (Balance Right), `Space` (Recovery), `Q`, `E`, `1`, `2`, `R` (Skills).
  - **Mobile:** Built-in virtual on-screen touch controls with tactile response.
- **Procedural Audio Synthesis:** Integrated Web Audio API sound generator for climbing footsteps, slipping slides, recovery chimes, skill sweeps, celebration fanfares, and 17 Agustus gamelan BGM.

### 3. Ludo Party (Second Game)
- **Classic 2–4 Player Board Game:** Standard Ludo rules with 52 perimeter tiles, 4 home stretches, and central victory crown.
- **Authentic Rules & Mechanics:**
  - Requires rolling a **6** to release tokens from home base into the track.
  - Rolling a **6** grants an extra turn.
  - Knocking/capturing opponent tokens on non-safe tiles sends them back to yard and awards a bonus turn.
  - 8 Safe Star squares preventing capture.
  - Exact rolls required to reach the center finish triangle.
- **Interactive Visuals:** 3D animated dice rolling, animated token movements, real-time turn countdown, and celebratory victory screen.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React, Zustand, Framer Motion, HTML5 Canvas 2D |
| **Backend** | Node.js (v24+), Express.js, Socket.IO 4, TypeScript |
| **Multiplayer Transport** | WebSocket via Socket.IO, Server-Authoritative Simulation Loop (20 Ticks/sec) |
| **Architecture** | Monorepo (npm workspaces: `@gamehouse/shared`, `@gamehouse/game-server`, `@gamehouse/web`) |
| **Storage** | In-memory `Map` data structures (Zero SQL/NoSQL database dependency) |
| **Audio** | Procedural Web Audio API sound synthesis |
| **Testing** | Node.js native test runner (`node:test`, `node:assert`, `tsx`) |

---

## 📁 Monorepo Structure

```text
GameHouse/
├── apps/
│   ├── web/                         # Next.js 14 App Router Frontend
│   │   ├── app/
│   │   │   ├── globals.css          # Dark gaming theme & styles
│   │   │   ├── layout.tsx           # Root HTML layout & metadata
│   │   │   ├── page.tsx             # Landing Home Page
│   │   │   └── room/[code]/page.tsx # Room route
│   │   ├── components/
│   │   │   ├── audio/SoundManager.ts # Web Audio procedural SFX
│   │   │   ├── branding/GameHouseLogo.tsx # Controller + House SVG logo
│   │   │   └── ui/                  # Button, Modal, AvatarSelector, Toast
│   │   ├── features/
│   │   │   ├── home/                # Hero, FeaturedGame, Explore, HowToPlay, Modals
│   │   │   ├── lobby/LobbyView.tsx  # Party lobby, player cards, host controls
│   │   │   ├── room/RoomContainer.tsx # State router (Lobby vs Arena vs Results)
│   │   │   └── games/panjat-pinang/ # Canvas 2D scene, HUDs, Virtual Controls, Result Modal
│   │   ├── hooks/                   # useSocket, useKeyboardControls
│   │   └── stores/                  # useGameStore, useSettingsStore
│   │
│   └── game-server/                 # Node.js + Socket.IO Server
│       └── src/
│           ├── core/GameModule.ts   # Reusable mini-game interface
│           ├── rooms/               # Room & RoomManager (In-memory storage)
│           ├── games/
│           │   ├── GameRegistry.ts  # Mini-game dynamic registration
│           │   └── panjat-pinang/PanjatPinangGame.ts # Authoritative physics engine
│           ├── socket/SocketHandler.ts # Event handlers & input rate-limiting
│           ├── server.ts            # Express + Socket.IO server entry
│           └── __tests__/           # Unit and End-to-End integration tests
│
├── packages/
│   └── shared/                      # Shared types, events, constants
│       └── src/
│           ├── constants/index.ts   # Physics constants, skill parameters, avatars
│           ├── events/index.ts      # Socket.IO client-server event contracts
│           ├── types/index.ts       # Room, Player, ClimberState, GameResults
│           └── index.ts
│
├── .env.example
├── package.json                     # Monorepo workspaces configuration
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher (Tested on Node.js v24)
- **npm**: v9.0.0 or higher

### Installation

1. **Clone repository and install dependencies:**
   ```bash
   git clone https://github.com/your-username/gamehouse.git
   cd gamehouse
   npm install
   ```

2. **Build the shared package:**
   ```bash
   npm run build:shared
   ```

3. **Start Development Servers:**
   To run both game server and web frontend simultaneously:
   ```bash
   npm run dev
   ```

   Or run them independently in separate terminals:
   ```bash
   # Terminal 1: Game Server (port 4000)
   npm run dev:server

   # Terminal 2: Next.js Web Frontend (port 3000)
   npm run dev:web
   ```

4. **Open in Browser:**
   - Web application: [http://localhost:3000](http://localhost:3000)
   - Game server health endpoint: [http://localhost:4000/health](http://localhost:4000/health)

---

## 🧪 Running Automated Tests

Run the full automated test suite (unit tests, room lifecycle, physics simulations, and end-to-end multi-client WebSocket flow):

```bash
npm test
```

### Test Coverage includes:
- ✅ **Room Management:** Room creation with readable `GH-XXXXX` code, capacity limit enforcement, private/public settings.
- ✅ **Host System:** Ready validation, start permission checks, and automatic host migration when host leaves.
- ✅ **Climbing Physics:** Height calculation, stamina consumption on climb, stamina regeneration on idle.
- ✅ **Slip & Fall Mechanics:** Balance drift, slip threshold breach, height penalty, stun duration.
- ✅ **Skill Engine:** Cooldown countdowns, Iron Grip immunity, Quick Recovery cleanse, Super Climb speed modifier.
- ✅ **Win Conditions:** First climber to 100% in Classic Race, highest climber in Survival mode.
- ✅ **Multiplayer E2E:** 2 real concurrent WebSocket clients creating room, joining, toggling ready, starting battle, streaming inputs, triggering skills, and host disconnecting with zero errors.

---

## 🌐 Testing Multiplayer with Two Browsers

To test real online multiplayer:
1. Open **Browser 1** (e.g. Chrome) and navigate to `http://localhost:3000`.
2. Click **Create Party Room**, choose your nickname (e.g. *Garuda1*), avatar, and click **Create Room**.
3. In the lobby, click **Copy Invitation Link** or note the 5-character room code (e.g. `GH-48291`).
4. Open **Browser 2** (e.g. Firefox or Chrome Incognito) and visit `http://localhost:3000`.
5. Click **Join Room**, enter the room code, and pick a distinct nickname and avatar.
6. In Browser 2, click **I'm Ready!**.
7. In Browser 1 (Host), the **START BATTLE!** button will illuminate. Click it to begin the 3-second countdown!
8. Use `W` or `Up Arrow` to climb, `A` / `D` to keep balance centered, and `Q`, `E`, `Space`, `R` for skills!

---

## 🚢 Deployment Guide

### Deploying Game Server (Node.js + Socket.IO)
The game server requires a persistent Node.js environment (WebSocket connections cannot run on serverless functions).
Recommended hosts: **Render**, **Railway**, **Fly.io**, or **DigitalOcean VPS**.

```bash
# Build
npm run build:shared
npm run build:server

# Start production server
npm run start --workspace=@gamehouse/game-server
```

**Environment Variables for Game Server:**
- `PORT=4000`
- `NODE_ENV=production`
- `CLIENT_URL=https://your-gamehouse-web.vercel.app`

### Deploying Frontend (Next.js)
Can be hosted on **Vercel**, **Netlify**, or **Cloudflare Pages**:

```bash
# Build production web bundle
npm run build:web
```

**Environment Variables for Frontend:**
- `NEXT_PUBLIC_GAME_SERVER_URL=https://your-gamehouse-server.onrender.com`

---

## 📄 License
MIT License. Built for gamers everywhere.
