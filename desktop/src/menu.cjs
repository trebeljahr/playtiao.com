// @ts-check
/**
 * Native application menu.
 *
 * We stick with Electron's OS-localized stock items for Edit / View /
 * Window — the menu bar strings are translated automatically by the
 * OS and wiring up next-intl here would be over-engineering.  Only
 * the custom "About Tiao" and "Open playtiao.com" entries are in
 * English; that's fine for v1.
 *
 * Keyboard shortcuts: the stock Electron menu items ship with the
 * correct per-platform accelerators (Cmd vs Ctrl, etc.), so we
 * don't need to spell them out.
 */

const { Menu, shell, app } = require("electron");

function buildMenu() {
  const isMac = process.platform === "darwin";

  /** @type {import('electron').MenuItemConstructorOptions[]} */
  const template = [
    // macOS app menu (only shown on macOS)
    ...(isMac
      ? [
          /** @type {import('electron').MenuItemConstructorOptions} */
          ({
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          }),
        ]
      : []),
    // File menu (non-macOS only — macOS exposes Quit via the app menu)
    ...(!isMac
      ? [
          /** @type {import('electron').MenuItemConstructorOptions} */
          ({
            label: "File",
            submenu: [{ role: "quit" }],
          }),
        ]
      : []),
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...(isMac
          ? /** @type {import('electron').MenuItemConstructorOptions[]} */ ([
              { role: "pasteAndMatchStyle" },
              { role: "delete" },
              { role: "selectAll" },
            ])
          : /** @type {import('electron').MenuItemConstructorOptions[]} */ ([
              { role: "delete" },
              { type: "separator" },
              { role: "selectAll" },
            ])),
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        ...(app.isPackaged
          ? []
          : /** @type {import('electron').MenuItemConstructorOptions[]} */ ([
              { role: "toggleDevTools" },
            ])),
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: isMac
        ? /** @type {import('electron').MenuItemConstructorOptions[]} */ ([
            { role: "minimize" },
            { role: "zoom" },
            { type: "separator" },
            { role: "front" },
          ])
        : /** @type {import('electron').MenuItemConstructorOptions[]} */ ([
            { role: "minimize" },
            { role: "close" },
          ]),
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Open playtiao.com",
          click: () => {
            void shell.openExternal("https://playtiao.com");
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

module.exports = { buildMenu };
