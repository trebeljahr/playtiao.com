import Redis from "ioredis";
import { REDIS_URL } from "./envVars";

let redisClient: Redis | null = null;

if (REDIS_URL && process.env.NODE_ENV !== "test") {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

  redisClient.on("connect", () => {
    console.info("[redis] Connected to Redis.");
  });

  redisClient.on("error", (err) => {
    console.error("[redis] Connection error:", err.message);
  });
}

export function getRedisClient(): Redis | null {
  return redisClient;
}
