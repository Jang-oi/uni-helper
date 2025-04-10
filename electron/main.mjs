import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerIpcHandlers, setMainWindow } from './ipc-handler.js';
import { fileURLToPath } from 'url';
import electronLocalShortcut from 'electron-localshortcut';

// ES 모듈에서는 __dirname이 없으므로 직접 생성
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
    },
    autoHideMenuBar: true,
    show           : true,
    resizable      : false,
    center         : true,
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === "development") {
    await mainWindow.loadURL("http://localhost:5173")
    mainWindow.webContents.openDevTools()
  } else {
    // In production, load the built app
    await mainWindow.loadFile(path.join(__dirname, "../dist/index.html"))
  }

  electronLocalShortcut.register(mainWindow, 'F5', () => {
    mainWindow.reload();
  });

  electronLocalShortcut.register(mainWindow, 'F12', () => {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // 메인 윈도우 참조 설정
  setMainWindow(mainWindow);

  // 개발 환경에서는 개발자 도구 열기
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  // IPC 핸들러 등록
  registerIpcHandlers();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});