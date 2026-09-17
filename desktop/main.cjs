"use strict";

const { app, BrowserWindow, Menu, shell, globalShortcut } = require("electron");
const path = require("path");

app.setName("Fin's");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("enable-features", "CanvasOopRasterization");

function gameFile() {
  return path.join(__dirname, "..", "game", "index.html");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "Fin's",
    backgroundColor: "#07111c",
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      webgl: true,
      spellcheck: false,
    },
    show: false,
  });

  win.once("ready-to-show", () => win.show());
  win.loadFile(gameFile());
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac
      ? [{ label: app.name, submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }] }]
      : [{ label: "File", submenu: [{ role: "quit" }] }]),
    {
      label: "View",
      submenu: [
        { role: "togglefullscreen" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  return win;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) {
      if (w.isMinimized()) w.restore();
      w.focus();
    }
  });
  app.whenReady().then(() => {
    createWindow();
    globalShortcut.register("F11", () => {
      const w = BrowserWindow.getFocusedWindow();
      if (w) w.setFullScreen(!w.isFullScreen());
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on("will-quit", () => globalShortcut.unregisterAll());
