// electron/main.js  (ESM)
import { app, BrowserWindow, protocol } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Registra esquema app:// con privilegios (antes de ready)
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true, supportFetchAPI: true } }
]);

const forceDist = process.env.FORCE_DIST === "1";
const isDev = !app.isPackaged && !forceDist;
const DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";

// Sirve dist/ a través de app:// con fallback a index.html (SPA)
function registerAppProtocol() {
  protocol.registerFileProtocol("app", (request, callback) => {
    const url = new URL(request.url);               // p.ej. app:///cobertura, app:///assets/x.js
    let pathname = decodeURIComponent(url.pathname);

    // Raíz o /index.html (o /index.html/lo-que-sea) => SPA
    if (
      pathname === "/" ||
      pathname === "" ||
      pathname === "/index.html" ||
      pathname.startsWith("/index.html/")
    ) {
      return callback(path.join(__dirname, "../dist/index.html"));
    }

    const fullPath = path.join(__dirname, "../dist", pathname);
    const hasExt = path.extname(pathname) !== "";

    // Rutas del SPA (sin extensión) o archivos inexistentes => SPA
    if (!hasExt || !fs.existsSync(fullPath)) {
      return callback(path.join(__dirname, "../dist/index.html"));
    }

    // Archivos reales (js/css/img/wasm…)
    callback(fullPath);
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
    win.loadURL("app://index.html"); // producción: sirve dist vía app://
  }

  // Log útil si algo falla
  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("did-fail-load", { code, desc, url });
  });
}

app.whenReady().then(() => {
  // Usa protocolo app:// si estamos empaquetados o si fuerzas dist en dev
  if (app.isPackaged || forceDist) registerAppProtocol();

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
