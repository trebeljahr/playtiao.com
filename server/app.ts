import "dotenv/config";
import express, { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/auth";
import { configureApp } from "./config";
import addErrorHandlingToApp from "./error-handling";
import gameAuthRoutes from "./routes/game-auth.routes";
import gameRoutes from "./routes/game.routes";
import indexRoutes from "./routes/index.routes";
import socialRoutes from "./routes/social.routes";
import adminRoutes from "./routes/admin.routes";
import tournamentRoutes from "./routes/tournament.routes";
import shopRoutes from "./routes/shop.routes";
import achievementRoutes from "./routes/achievement.routes";
const app = express();

// Mount better-auth BEFORE express.json() to avoid body consumption conflicts
app.all("/api/auth/*splat", toNodeHandler(auth));

// Mount Stripe webhook BEFORE express.json() — it needs the raw body for signature verification
app.post("/shop/webhook", express.raw({ type: "application/json" }), (req, res, next) => {
  shopRoutes.handle(req, res, next);
});
app.post("/api/shop/webhook", express.raw({ type: "application/json" }), (req, res, next) => {
  shopRoutes.handle(req, res, next);
});

configureApp(app);

function mountRouteVariants(basePath: string, router: Router) {
  app.use(basePath, router);

  const apiBasePath = basePath === "/" ? "/api" : `/api${basePath}`;
  app.use(apiBasePath, router);
}

app.get("/", (_, res) => {
  res
    .type("text/plain")
    .send(
      "Tiao API server is running. Start the Vite client in development or deploy the separate frontend service.",
    );
});

// Accept both root-mounted and /api-prefixed paths so the backend can sit
// behind either a direct origin or a path-based reverse proxy without
// forcing the frontend and deployment config to agree on path rewriting.
mountRouteVariants("/", indexRoutes);
mountRouteVariants("/player", gameAuthRoutes);
mountRouteVariants("/", gameRoutes);
mountRouteVariants("/", socialRoutes);
mountRouteVariants("/player/admin", adminRoutes);
mountRouteVariants("/", tournamentRoutes);
mountRouteVariants("/shop", shopRoutes);
mountRouteVariants("/player", achievementRoutes);

addErrorHandlingToApp(app);

export default app;
