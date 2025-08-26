// electron/main.js  (ESM)
import { app, BrowserWindow, protocol } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// (opcional) define el esquema como “seguro/estándar”
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true, supportFetchAPI: true } }
]);

const forceDist = process.env.FORCE_DIST === "1";
const isDev = !app.isPackaged && !forceDist;
const DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";

function registerAppProtocol() {
  // Mapea app://<lo-que-sea> → .../dist/<lo-que-sea>
  protocol.registerFileProtocol("app", (request, callback) => {
    // request.url es tipo: app://index.html o app:///assets/xxx
    const url = new URL(request.url);
    // Normaliza: si piden "app:///" o "app://index.html" sirve el index
    const rel = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.join(__dirname, "../dist", rel);
    callback(filePath);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: "appjuventud"
  });

  if (isDev) {
    win.loadURL(DEV_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadURL("app://index.html"); // ✅ sirve index y todos los assets bajo app://
  }

  // debug si algo no carga
  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("did-fail-load", { code, desc, url });
  });
}

app.whenReady().then(() => {
  if (!isDev) registerAppProtocol();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
