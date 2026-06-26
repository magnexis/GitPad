import { app, BrowserWindow, dialog, ipcMain, safeStorage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppBackend } from '../backend/commands/ipc.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

let mainWindow: InstanceType<typeof BrowserWindow> | null = null;

app.disableHardwareAcceleration();

process.on('uncaughtException', (error) => {
  console.error('[GitPad] Uncaught exception in main process', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[GitPad] Unhandled rejection in main process', reason);
});

function resolveIconPath() {
  return isDev ? path.join(process.cwd(), 'public', 'GITPAD.png') : path.join(__dirname, '../../dist/GITPAD.png');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    title: 'GitPad',
    backgroundColor: '#0f1218',
    icon: resolveIconPath(),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, '../electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, description, validatedURL) => {
    console.error(`[GitPad] Renderer failed to load (${code}) ${description} ${validatedURL}`);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[GitPad] Renderer process gone: ${details.reason}`);
  });
  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error(`[GitPad] Preload failed at ${preloadPath}: ${error.message}`);
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL).catch((error) => {
      console.error('[GitPad] Failed to load dev URL', error);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html')).catch((error) => {
      console.error('[GitPad] Failed to load production file', error);
    });
  }
}

app.whenReady().then(() => {
  const backend = createAppBackend({
    appDataPath: app.getPath('userData'),
    documentsPath: app.getPath('documents'),
    chooseDirectory: async () => {
      const result = mainWindow
        ? await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory', 'createDirectory']
          })
        : await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory']
      });
      return result.canceled ? undefined : result.filePaths[0];
    },
    encrypt: (value: string) => {
      if (!safeStorage.isEncryptionAvailable()) return Buffer.from(value, 'utf8').toString('base64');
      return safeStorage.encryptString(value).toString('base64');
    },
    decrypt: (value: string) => {
      const buffer = Buffer.from(value, 'base64');
      if (!safeStorage.isEncryptionAvailable()) return buffer.toString('utf8');
      return safeStorage.decryptString(buffer);
    }
  });
  backend.register(ipcMain);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
