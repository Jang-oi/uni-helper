import { app, BrowserWindow, Menu, Tray } from 'electron';
import electronLocalShortcut from 'electron-localshortcut';
import path from 'path';
import { fileURLToPath } from 'url';

import { registerIpcHandlers, setMainWindow } from './ipc-handler.js';

// ES 모듈에서는 __dirname이 없으므로 직접 생성
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow, tray;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized() || !mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    icon: path.join(__dirname, '256_favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
    },
    autoHideMenuBar: true,
    show: true,
    resizable: false,
    center: true,
  });
  Menu.setApplicationMenu(null); // 전역 메뉴 없앰

  const indexPath = path.join(__dirname, '../build/index.html'); // 패키징된 앱에서의 경로
  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:5173');
    electronLocalShortcut.register(mainWindow, 'F5', () => {
      mainWindow.reload();
    });
  } else await mainWindow.loadFile(indexPath);

  electronLocalShortcut.register(mainWindow, 'F12', () => {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  });
  // 메인 윈도우 참조 설정

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault(); // 창 닫기 방지
      mainWindow.minimize(); // 대신 창 숨김
    }
  });

  setMainWindow(mainWindow);
}

const createTray = () => {
  tray = new Tray(path.join(__dirname, '256_favicon.ico'));
  const contextMenu = Menu.buildFromTemplate([
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

app.on('ready', () => {
  // IPC 핸들러 등록
  registerIpcHandlers();
  createTray();
  createWindow();
  app.setAppUserModelId('com.unipost.helper.app');

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
