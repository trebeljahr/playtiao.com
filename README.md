# Tiao

Tiao (跳, "jump") is an open-source multiplayer board game platform. Two players place and jump pieces on a 19x19 board, competing to be the first to capture 10 enemy stones. Think of it as the [Lichess](https://lichess.org) for Tiao -- free, open-source, and community-driven.

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

For the complete rulebook, see [docs/GAME_RULES.md](docs/GAME_RULES.md).

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
git clone https://github.com/YOUR_USERNAME/tiao.git
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

### Available Commands

```bash
npm run dev          # Start both client and server with hot reload
npm run client       # Start only the Vite frontend
npm run server       # Start only the Express backend
npm test             # Run server unit tests
```

## Project Structure

```
tiao/
├── client/          React + Vite + Tailwind frontend
├── server/          Express + WebSocket backend
├── shared/          Pure TypeScript game engine + protocol types
├── e2e/             Playwright end-to-end tests
└── docs/            Documentation
```

The game engine (`shared/src/tiao.ts`) is a set of pure functions with no side effects -- both the server and client use it to validate and apply moves.

## Documentation

| Document | Description |
|----------|-------------|
| [docs/GAME_RULES.md](docs/GAME_RULES.md) | Complete game rules with diagrams |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, and technical decisions |
| [docs/API.md](docs/API.md) | REST and WebSocket API reference |
| [docs/TESTING.md](docs/TESTING.md) | Testing guide, harnesses, and how to add tests |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [docs/coolify-deployment.md](docs/coolify-deployment.md) | Coolify/Docker deployment guide |

## Testing

```bash
# Server unit tests (68 tests)
npm --prefix server test

# Client unit tests (63 tests)
cd client && npx vitest run

# E2E tests (requires running servers)
npx playwright test
```

See [docs/TESTING.md](docs/TESTING.md) for the full guide.

## Deployment

Production runs as two Docker containers:

- **client** -- Nginx serving the Vite build, proxying `/api` and `/ws` to the backend
- **server** -- Express + WebSocket on a single Node.js process

### Required Environment Variables

**Backend:**
- `MONGODB_URI` -- MongoDB connection string
- `TOKEN_SECRET` -- secret for session token hashing
- `S3_BUCKET_NAME`, `S3_PUBLIC_URL` -- for profile picture uploads
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

**Optional:**
- `FRONTEND_URL` -- for cross-origin CORS setups
- `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE` -- for S3-compatible providers (MinIO, etc.)
- `PORT` -- server port (defaults to 5005 in dev, 3000 in production)

See `.env.example` files in `server/` and `client/` for templates.

### CI/CD

The GitHub Actions workflow (`build-and-deploy.yml`) builds and tests on every push to `main`, then pushes Docker images to GHCR. Optional Coolify deployment is triggered via API if the secrets are configured.

See [docs/coolify-deployment.md](docs/coolify-deployment.md) for the full deployment guide.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, coding conventions, and how to submit changes.

## License

TBD
