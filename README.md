# Tiao

Tiao is a monorepo with:
- `client/`: Vite + React frontend
- `server/`: Express + WebSocket backend
- `shared/`: shared protocol and game logic

## Development

The default local workflow is:
- `npm run dev`: starts the Express/WebSocket server on `5005` and the Vite dev server on `3000` with HMR.

How requests flow in development:
- the browser loads the frontend from Vite on `http://localhost:3000`
- Vite proxies `/api` and `/ws` to the backend on `http://localhost:5005`
- that keeps the app code on relative URLs while preserving a fast HMR loop

Useful direct commands:
- `npm run client`
- `npm run server`

`vite preview` is not part of the normal development loop here.

## Deployment shape

Production is designed to run as two services:
- `client/`: a static frontend container built with Vite
- `server/`: the Express + WebSocket backend container

The default production setup keeps a single browser origin even though the services are split:
- the frontend container serves the app
- the frontend container proxies `/api` and `/ws` to the backend container
- the backend does not serve frontend assets anymore

That gives you the DX benefits of a split frontend/backend architecture without reintroducing cross-origin cookie pain.

Authentication now uses an opaque `HttpOnly` session cookie backed by MongoDB:
- the browser stores only the session handle
- player/account identity is resolved on the server from the session collection
- the default same-origin proxy setup keeps cookie auth simple for both `/api` and `/api/ws`

Two production routing styles are supported:
- frontend-proxy mode: the frontend container proxies `/api` and `/api/ws` to the backend via `BACKEND_UPSTREAM`
- path-routing mode: your platform routes `https://your-domain/api` and `https://your-domain/api/ws` straight to the backend app, while the frontend still serves `/`

Local development keeps using the Vite proxy on `http://localhost:3000` to reach the backend on `http://localhost:5005`.

## Coolify / Docker deployment

This repo includes:
- [client/Dockerfile](/Users/rico/projects/tiao/client/Dockerfile)
- [server/Dockerfile](/Users/rico/projects/tiao/server/Dockerfile)
- [client/nginx/default.conf.template](/Users/rico/projects/tiao/client/nginx/default.conf.template)
- [.dockerignore](/Users/rico/projects/tiao/.dockerignore)
- [build-and-deploy.yml](/Users/rico/projects/tiao/.github/workflows/build-and-deploy.yml)
- [client/.env.example](/Users/rico/projects/tiao/client/.env.example)
- [server/.env.example](/Users/rico/projects/tiao/server/.env.example)

The deployment split now looks like this:
- the client image serves the built frontend on port `80`
- the client image can proxy `/api` and `/api/ws` to `BACKEND_UPSTREAM`
- the server image exposes the API and WebSocket service on port `3000`
- the server health endpoint stays at `/api/health`
- the client health endpoint is `/healthz`

## Required environment variables

See [server/.env.example](/Users/rico/projects/tiao/server/.env.example) and [client/.env.example](/Users/rico/projects/tiao/client/.env.example) for concrete templates.

Backend core variables:
- `MONGODB_URI`
- `TOKEN_SECRET`
- `S3_BUCKET_NAME`
- `S3_PUBLIC_URL` or `CLOUDFRONT_URL`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Optional for S3-compatible providers:
- `S3_ENDPOINT`
- `S3_FORCE_PATH_STYLE`

Notes:
- backend `PORT` defaults to `3000` if not provided
- `FRONTEND_URL` is useful when the browser talks to the backend directly across origins
- same-origin deployments do not require cross-site cookies because the browser stays on the frontend origin
- `VITE_API_BASE_URL` is optional and only needed if you choose a direct browser-to-backend deployment instead of the proxy-based one
- MongoDB now stores account data, social data, room data, and session records

## CI/CD

The GitHub Actions workflow:
- installs dependencies
- runs the repo build
- runs server tests
- builds and pushes a client image to GHCR on every push to `main`
- builds and pushes a server image to GHCR on every push to `main`

If you set these GitHub secrets, the workflow will also trigger a Coolify deployment after the image push:
- `COOLIFY_BASE_URL`
- `COOLIFY_API_TOKEN`
- `COOLIFY_CLIENT_RESOURCE_UUID`
- `COOLIFY_SERVER_RESOURCE_UUID`

There are also legacy webhook fallbacks if you prefer them:
- `COOLIFY_CLIENT_DEPLOY_WEBHOOK`
- `COOLIFY_SERVER_DEPLOY_WEBHOOK`

There is a concrete Coolify setup guide in [docs/coolify-deployment.md](/Users/rico/projects/tiao/docs/coolify-deployment.md), including:
- first-deploy steps
- frontend/backend application settings
- internal proxy wiring
- MongoDB/internal URL guidance
- troubleshooting for frontend routing, backend health, and GHCR pull issues

## Realtime deployment note

Tiao multiplayer currently keeps live room/socket coordination in a single Node process. That means deploys can be graceful, but active websocket matches may briefly reconnect during a deployment. True near-zero-downtime multiplayer would require shared realtime state outside the process.
