
# 🎮 Multiplayer Tic-Tac-Toe (React + Nakama)

A fully production-ready, real-time **multiplayer Tic-Tac-Toe game** built using:

* **React + Vite** (frontend)
* **Nakama** (server-authoritative multiplayer backend)
* **Lua** (match logic)
* **Railway** (backend hosting)
* **Vercel** (frontend hosting)

This project demonstrates:

* Server authoritative gameplay
* Matchmaking (Classic + Timed modes)
* Real-time WebSocket updates
* Rematch system
* Player stats (W/L/D)
* Leaderboard
* Cloud deployment (production ready)

---

## 🚀 Live Demo

[Play the game](https://tik-tak-toe-amber.vercel.app/)


---

# 🛠️ Features

## 🎯 Gameplay

* Fully server-authoritative logic (no cheating possible)
* Real-time WebSocket updates
* Win, loss, draw detection
* Automatic timeout defeat (Timed mode)
* Smooth rematch system

## 🔎 Matchmaking

* Classic mode
* Timed mode (30s per turn)
* Queue cancellation
* Automatic match creation on Railway

## 📊 Player Statistics

* Wins / losses / draws stored in Nakama Storage
* Stored per user device with persistent login

## 🏆 Leaderboard

* Global leaderboard based on wins
* Shows metadata (losses, draws)
* Paginated top players list

## 🔐 Persistent User Identity

* Uses Nakama `authenticateDevice`
* Automatically reconnects with last device ID

---

# 🧩 Technology Stack

### **Frontend**

* React + Vite
* TailwindCSS
* Nakama JavaScript client (`@heroiclabs/nakama-js`)
* WebSockets for real-time updates

### **Backend**

* Nakama 3.21+
* Lua runtime module
* CockroachDB / Postgres
* Dockerized

### **Deployment**

* Backend → Railway
* Frontend → Vercel
* Public Networking → Port 7350 mapped to 443

---

# 🧪 Local Development

## 1️⃣ Start Nakama server locally

Inside `/backend`:

```bash
docker compose up --build
```

Nakama:

```
http://localhost:7351 (Console)
ws://localhost:7350 (WebSocket)
```

## 2️⃣ Start React frontend

Inside `/frontend`:

Add `.env`:

```
VITE_NAKAMA_HOST=127.0.0.1
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_USE_SSL=false
VITE_NAKAMA_SERVER_KEY=tictactoe-server-key
```

Then:

```bash
npm install
npm run dev
```

---

# ☁️ Production Deployment

## 🚀 Backend → Railway

Upload the **Dockerfile** from `/backend`.

Required Railway Variables:

```
NAKAMA_DATABASE_ADDRESS = <DATABASE_PUBLIC_URL>
NAKAMA_LOG_LEVEL = DEBUG
```

Create **Public Networking**:

```
Expose port → 7350
Public domain → <railway url>
```

## 🚀 Frontend → Vercel

In Vercel → Environment Variables:

```
VITE_NAKAMA_HOST=<railway url>
VITE_NAKAMA_PORT=443
VITE_NAKAMA_USE_SSL=true
VITE_NAKAMA_SERVER_KEY=tictactoe-server-key
```

Build + deploy.

---

# 🧠 Architecture Overview

### Server Authoritative Flow

```
Client → (OPCODE_MOVE) → Nakama Lua Module
Lua validates:
    - turn order
    - cell availability
    - match state
    - victory/draw
Nakama → (OPCODE_STATE) → Broadcast to both players
```

### Matchmaking Flow

```
Client → addMatchmaker → Nakama
Nakama → matchmaker_matched → create authoritative match
Client → joinMatch → sync state
```

---

# 🏁 Future Enhancements

* Chat inside match
* AI opponent mode
* User accounts (email-based instead of device ID)
* Skins/themes for board

---

# 👨‍💻 Author

**Sanah Saleem**
Feel free to contribute or open issues!

