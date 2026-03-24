import "dotenv/config";
import express from "express";
import { configureApp } from "./config";
import addErrorHandlingToApp from "./error-handling";
import gameAuthRoutes from "./routes/game-auth.routes";
import gameRoutes from "./routes/game.routes";
import indexRoutes from "./routes/index.routes";
import socialRoutes from "./routes/social.routes";
const app = express();

configureApp(app);

app.get("/", (_, res) => {
  res.type("text/plain").send(
    "Tiao API server is running. Start the Vite client in development or deploy the separate frontend service."
  );
});

app.use("/api", indexRoutes);
app.use("/api/player", gameAuthRoutes);
app.use("/api", gameRoutes);
app.use("/api", socialRoutes);

addErrorHandlingToApp(app);

export default app;
