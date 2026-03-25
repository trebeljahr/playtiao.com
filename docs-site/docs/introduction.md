---
sidebar_position: 1
title: Introduction
slug: /
---

# Tiao

Tiao (跳, "jump") is an open-source multiplayer board game platform. Two players place and jump pieces on a 19x19 board, competing to be the first to capture 10 enemy stones.

## The Game

Players take turns placing pieces or jumping over enemy pieces to capture them:

```
  Place a piece:          Jump to capture:

  . . . . .              . . . . .         . . . . .
  . . . . .              . W . . .         . . . . .
  . . W . .              . . B . .   -->   . . x . .
  . . . . .              . . . . .         . . . W .
  . . . . .              . . . . .         . . . . .
```

Jumps can chain -- keep jumping with the same piece if more captures are available. First to 10 captures wins.

## Features

- **Local play** -- two players on the same device
- **Computer opponent** -- play against an AI
- **Online multiplayer** -- real-time games over WebSocket
- **Matchmaking** -- automatic opponent pairing
- **Friends and invitations** -- add friends, invite them to games
- **Game history** -- browse your past matches
- **Accounts** -- optional signup with profile pictures, or play as a guest

## Quick Start

**Prerequisites:** Node.js 22.x, MongoDB, npm

```bash
git clone https://github.com/your-org/tiao.git
cd tiao

# Install all dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Set up environment
cp server/.env.example server/.env
# Edit server/.env with your MONGODB_URI and TOKEN_SECRET

# Start development servers
npm run dev
```

Open `http://localhost:3000`. The Vite frontend runs on port 3000 and proxies API/WebSocket requests to the Express backend on port 5005.

## Project Structure

```
tiao/
├── client/          React + Vite + Tailwind frontend
├── server/          Express + WebSocket backend
├── shared/          Pure TypeScript game engine + protocol types
├── e2e/             Playwright end-to-end tests
├── docs/            Markdown documentation (source for this site)
└── docs-site/       Docusaurus documentation site
```
