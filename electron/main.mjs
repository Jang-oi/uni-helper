import { app, BrowserWindow, Menu, Tray } from 'electron';
import path from 'path';
import { registerIpcHandlers, setMainWindow } from './ipc-handler.js';
import { fileURLToPath } from 'url';
import electronLocalShortcut from 'electron-localshortcut';

// ES 모듈에서는 __dirname이 없으므로 직접 생성
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow, tray;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
    },
    autoHideMenuBar: true,
    show           : true,
    resizable      : false,
    center         : true,
  });

  const indexPath = path.join(__dirname, '../build/index.html') // 패키징된 앱에서의 경로

  if (process.env.NODE_ENV === "development") await mainWindow.loadURL("http://localhost:5173")
  else await mainWindow.loadFile(indexPath);

  electronLocalShortcut.register(mainWindow, 'F5', () => {
    mainWindow.reload();
  });

  electronLocalShortcut.register(mainWindow, 'F12', () => {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // 메인 윈도우 참조 설정
  setMainWindow(mainWindow);
}

const createTray = () => {
  tray = new Tray(path.join(__dirname, 'favicon.ico'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '재시작',
      click: () => {
        app.relaunch();
        app.exit();
      },
    },
    {
      label: '종료',
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('uni-helper-app');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.show();
  });
};

app.whenReady().then(() => {
  // IPC 핸들러 등록
  registerIpcHandlers();
  createTray();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
