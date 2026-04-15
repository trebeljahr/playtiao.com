// @ts-check
/**
 * BrowserWindow factory with hardened webPreferences.
 *
 * Security posture notes:
 *   - `contextIsolation: true` keeps the preload script's globals
 *     separate from the renderer's global scope.  Without this, a
 *     future XSS in the bundled client could reach into our
 *     Node-privileged APIs.
 *   - `nodeIntegration: false` removes `require` from the renderer.
 *   - `sandbox: true` runs the renderer in an OS-level sandbox.
 *   - `webSecurity: true` enforces same-origin policy.
 *   - `allowRunningInsecureContent: false` blocks mixed content.
 *
 * These are all modern Electron defaults but being explicit is
 * cheap insurance — a future Electron version could flip a default,
 * and the XSS → RCE gap is the single scariest failure mode for
 * a desktop wrapper.
 */

const { BrowserWindow } = require("electron");
const path = require("node:path");

/**
 * @param {{ startUrl: string; devTools: boolean }} options
 */
function createMainWindow({ startUrl, devTools }) {
  const iconPath = path.join(__dirname, "..", "assets", "icon.png");

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Tiao",
    icon: iconPath,
    backgroundColor: "#1a0f06",
    show: false, // wait until content is ready to avoid a white flash
    webPreferences: {
      preload: path.join(__dirname, "..", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools,
    },
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  void win.loadURL(startUrl);

  if (devTools) {
    // Open dev tools in a detached panel so it doesn't take up half
    // the game window at small sizes.
    win.webContents.openDevTools({ mode: "detach" });
  }

  return win;
}

module.exports = { createMainWindow };
