export type LogEntry = {
  timestamp: string;
  level: "log" | "warn" | "error" | "info" | "debug";
  message: string;
};

export const LOG_BUFFER_SIZE = 500;
export const logBuffer: LogEntry[] = [];

export function captureLog(level: LogEntry["level"], args: unknown[]) {
  const message = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");

  logBuffer.push({
    timestamp: new Date().toISOString(),
    level,
    message,
  });

  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.splice(0, logBuffer.length - LOG_BUFFER_SIZE);
  }
}

/** Saved references to the real console methods before interception. */
export const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

export function dump() {
  const data = {
    version: process.env.APP_VERSION ?? "unknown",
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      devicePixelRatio: window.devicePixelRatio,
    },
    logs: logBuffer.slice(),
  };

  const json = JSON.stringify(data, null, 2);
  originalConsole.log(json);
  return data;
}

declare global {
  interface Window {
    Dump: typeof dump;
  }
}

/**
 * Install console interception and attach window.Dump().
 * Safe to call only in the browser (guarded by the caller).
 */
export function installDump() {
  const LEVELS = ["log", "warn", "error", "info", "debug"] as const;
  for (const level of LEVELS) {
    const original = originalConsole[level];
    console[level] = (...args: unknown[]) => {
      captureLog(level, args);
      original(...args);
    };
  }

  window.addEventListener("error", (event) => {
    captureLog("error", [
      `Uncaught: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
    ]);
  });

  window.addEventListener("unhandledrejection", (event) => {
    captureLog("error", [`Unhandled rejection: ${event.reason}`]);
  });

  window.Dump = dump;
}

// Auto-install when loaded in the browser (side-effect import).
if (typeof window !== "undefined") {
  installDump();
}
