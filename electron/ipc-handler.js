import { BrowserWindow, ipcMain, Notification, shell } from 'electron';
import electronLocalShortcut from 'electron-localshortcut';
import Store from 'electron-store';
import path from 'path';
import { fileURLToPath } from 'url';

// ES 모듈에서는 __dirname이 없으므로 직접 생성
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 상수 정의
const SUPPORT_URL = 'https://114.unipost.co.kr/home.uni';
const SESSION_CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4시간

// 상태 관리
const store = new Store();
let mainWindow, dataWindow;
let isMonitoring = false;
let monitoringInterval = null;
let sessionCheckInterval = null;
let isLoggedIn = false;

// 메인 윈도우 설정 함수
export function setMainWindow(window) {
  mainWindow = window;
}

// 외부 링크 열기
const openUniPost = (srIdx) => {
  console.log(`${SUPPORT_URL}?access=list&srIdx=${srIdx}`);
  shell.openExternal(`${SUPPORT_URL}?access=list&srIdx=${srIdx}`);
};

// 로그인 확인 함수
async function ensureLoggedIn() {
  // 이미 로그인 상태면 바로 반환
  if (isLoggedIn) return true;

  // 설정 확인
  const settings = store.get('settings');
  if (!settings || !settings.username || !settings.password) {
    return false;
  }

  try {
    // 로그인 시도
    const result = await performLogin(settings.username, settings.password);
    isLoggedIn = result.success;
    return isLoggedIn;
  } catch (error) {
    console.error('로그인 실패:', error);
    return false;
  }
}

// 로그인 수행 함수
async function performLogin(username, password) {
  // 로그인용 브라우저 창 생성
  const loginWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  try {
    // 사이트 로드
    await loginWindow.loadURL(SUPPORT_URL);

    // 로그인 페이지 확인 및 로그인 시도
    const loginResult = await loginWindow.webContents.executeJavaScript(`
      (function() {
        try {
          const usernameField = document.querySelector("#userId");
          const passwordField = document.querySelector("#password");
          const loginButton = document.querySelector("body > div.wrap.login > div > div > div > div > form > fieldset > div.btn-area > button");
          
          if (!usernameField || !passwordField || !loginButton) {
            return { success: false, message: "로그인 요소를 찾을 수 없습니다" };
          }
          
          usernameField.value = "${username.replace(/"/g, '\\"')}";
          passwordField.value = "${password.replace(/"/g, '\\"')}";
          loginButton.click();
          
          return { success: true, message: "로그인 시도 완료" };
        } catch (error) {
          return { success: false, message: "로그인 스크립트 오류: " + error.message };
        }
      })();
    `);

    if (!loginResult.success) return loginResult;

    // 로그인 성공 여부 확인 (대기 시간)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 로그인 후 상태 확인
    return await checkLoginSession(loginWindow);
  } catch (error) {
    return { success: false, message: error.toString() };
  } finally {
    if (!loginWindow.isDestroyed()) {
      loginWindow.close();
    }
  }
}

// 로그인 세션 확인
async function checkLoginSession(window) {
  try {
    // iframe 내 로그인 상태 확인
    const checkLogin = await window.webContents.executeJavaScript(`
    (function() {
      try {
        // 에러 메시지 확인
        const errorEl = document.querySelector('.up-alarm-box .up-alarm-message');
        if (errorEl && getComputedStyle(document.querySelector("#up-alarm")).display === "block") {
            return { success: false, message: errorEl.textContent.trim() || "로그인 실패" };
        }
        
        // 요청내역관리 탭 확인
        const li = document.querySelector('li[title="요청내역관리"], li[name="요청내역관리"]');
        if (!li) {
          return { success: false, message: "로그인 후 요청내역관리 탭을 찾을 수 없습니다" };
        }
        
        const tabId = li.getAttribute('aria-controls');
        const iframe = document.getElementById(tabId);
        
        if (!iframe || !iframe.contentWindow) {
          return { success: false, message: "iframe을 찾을 수 없습니다" };
        }
        
        return { success: true, message: "로그인 성공" };
        
      } catch (error) {
        return { success: false, message: "상태 확인 오류: " + error.message };
      }
    })();
  `);

    console.log('로그인 상태 확인:', checkLogin);
    return checkLogin;
  } catch (error) {
    return { success: false, message: '세션 확인 중 오류: ' + error.toString() };
  }
}

// 데이터 스크래핑 함수
async function scrapeDataFromSite() {
  // 로그인 상태 확인 및 필요시 로그인
  const loggedIn = await ensureLoggedIn();
  if (!loggedIn) {
    console.error('데이터 스크래핑을 위한 로그인 실패');
    return { success: false, message: '로그인 실패', data: [] };
  }

  dataWindow = new BrowserWindow({
    show: true,
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  try {
    await dataWindow.loadURL(SUPPORT_URL);

    // 개발 편의를 위한 단축키 등록
    electronLocalShortcut.register(dataWindow, 'F5', () => {
      dataWindow.reload();
    });

    electronLocalShortcut.register(dataWindow, 'F12', () => {
      dataWindow.webContents.openDevTools({ mode: 'detach' });
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // iframe 내 데이터 스크래핑
    const result = await dataWindow.webContents.executeJavaScript(`
      (function() {
            try {
              const li = document.querySelector('li[title="요청내역관리"], li[name="요청내역관리"]');
              if (!li) return { success: false, message: "요청내역관리 탭을 찾을 수 없습니다" };
              
              const tabId = li.getAttribute('aria-controls');
              const iframe = document.getElementById(tabId);
              
              if (!iframe || !iframe.contentWindow) return { success: false, message: "iframe을 찾을 수 없습니다" };
              const grid = iframe.contentWindow.grid;
              const gridData = grid.getAllRowValue();

              return { success: true, data: gridData };
            } catch (error) {
              return { success: false, message: "데이터 스크래핑 오류: " + error.message };
            }
      })();
    `);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      console.error('데이터 스크래핑 실패:', result.message);
      return { success: false, message: result.message, data: [] };
    }
  } catch (error) {
    console.error('데이터 스크래핑 중 오류:', error);
    return { success: false, message: error.toString(), data: [] };
  } finally {
    if (!dataWindow.isDestroyed()) {
      dataWindow.close();
    }
  }
}

// 모니터링 함수
async function checkForNewRequests() {
  try {
    // 현재 시간 설정
    const now = new Date();
    const nowString = now.toLocaleString();

    // 스크래핑 데이터 가져오기
    const result = await scrapeDataFromSite();

    // 마지막 확인 시간 업데이트
    store.set('lastChecked', nowString);

    if (!result.success) {
      // 스크래핑 실패 시 메인 윈도우에 알림
      if (mainWindow) mainWindow.webContents.send('scraping-error', result.message);
      return { success: false, message: result.message };
    }

    const data = result.data;

    if (data.length > 0) {
      // 이전 데이터와 비교하여 새로운 항목 확인
      const existingAlerts = store.get('alerts') || [];
      const existingIds = new Set(existingAlerts.map((alert) => alert.id));

      // 각 데이터 항목을 알림으로 변환
      const alerts = data.map((item) => ({
        SR_IDX: item['SR_IDX'],
        REQ_TITLE: item['REQ_TITLE'],
        STATUS: item['STATUS'],
        WRITER: item['WRITER'],
        REQ_DATE: item['REQ_DATE'],
        REQ_DATE_ALL: item['REQ_DATE_ALL'],
        isNew: true,
      }));

      // 새로운 알림만 필터링
      const newAlerts = alerts.filter((alert) => !existingIds.has(alert.id));

      const resultAlerts = newAlerts.filter((newAlert) => newAlert['WRITER'] === '');
      if (resultAlerts.length > 0) {
        // 새 알림을 저장소에 추가
        store.set('alerts', [...resultAlerts, ...newAlerts, ...existingAlerts]);

        resultAlerts.forEach((alert) => {
          const notification = new Notification({
            title: `📬 새 요청 도착! - ${alert.REQ_TITLE}`,
            body: `💡 상태: ${alert.STATUS}\n🕒 요청 시간: ${alert.REQ_DATE_ALL}`,
          });

          // 클릭하면 브라우저 열기
          notification.on('click', () => {
            openUniPost(alert.SR_IDX);
          });

          // 알림 표시
          notification.show();
        });
      }

      return { success: true, newAlerts: resultAlerts.length };
    }

    return { success: true, newAlerts: 0 };
  } catch (error) {
    console.error('모니터링 중 오류:', error);
    return { success: false, error: error.toString() };
  }
}

// 모니터링 시작 함수
async function startMonitoring() {
  // 이미 실행 중인 인터벌 정리
  if (monitoringInterval) clearInterval(monitoringInterval);

  // 설정 확인
  const settings = store.get('settings');
  if (!settings || !settings.checkInterval) {
    return { success: false, message: '설정 정보가 없습니다.' };
  }

  // 분을 밀리초로 변환
  const interval = settings.checkInterval * 60 * 1000;

  // 초기 체크 (로그인 포함)
  const loggedIn = await ensureLoggedIn();
  if (!loggedIn) {
    console.error('모니터링 시작 실패: 로그인할 수 없습니다');
    if (mainWindow) {
      mainWindow.webContents.send('login-error', '모니터링을 시작할 수 없습니다. 로그인 정보를 확인해주세요.');
    }
    return { success: false, message: '로그인할 수 없습니다. 아이디와 비밀번호를 확인해주세요.' };
  }

  try {
    // 로그인 성공 시 첫 번째 데이터 체크 실행
    const initialCheck = await checkForNewRequests();
    if (!initialCheck.success) {
      return { success: false, message: `초기 데이터 확인 실패: ${initialCheck.message || initialCheck.error}` };
    }

    // 세션 만료 방지를 위한 주기적 체크
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
    }
    sessionCheckInterval = setInterval(ensureLoggedIn, SESSION_CHECK_INTERVAL);

    // 데이터 모니터링 인터벌 설정
    monitoringInterval = setInterval(checkForNewRequests, interval);
    isMonitoring = true;

    return { success: true, message: '모니터링이 시작되었습니다.' };
  } catch (error) {
    console.error('모니터링 시작 중 오류:', error);
    return { success: false, message: `모니터링 시작 중 오류: ${error.toString()}` };
  }
}

// 모니터링 중지 함수
function stopMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }

  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }

  isMonitoring = false;
  return { success: true, message: '모니터링이 중지되었습니다.' };
}

// IPC 핸들러 등록
export function registerIpcHandlers() {
  // 설정 관련 핸들러
  ipcMain.handle('get-settings', async () => {
    return store.get('settings');
  });

  ipcMain.handle('save-settings', async (event, settings) => {
    try {
      store.set('settings', settings);
      return { success: true };
    } catch (error) {
      console.error('설정 저장 중 오류:', error);
      return { success: false, message: error.toString() };
    }
  });

  // 모니터링 관련 핸들러
  ipcMain.handle('toggle-monitoring', async (event, status) => {
    if (status) {
      return startMonitoring();
    } else {
      return stopMonitoring();
    }
  });

  ipcMain.handle('get-monitoring-status', async () => {
    return isMonitoring;
  });

  // 알림 관련 핸들러
  ipcMain.handle('get-alerts', async () => {
    return {
      alerts: store.get('alerts') || [],
      lastChecked: store.get('lastChecked'),
    };
  });

  ipcMain.handle('clear-alerts', async () => {
    try {
      store.set('alerts', []);
      return { success: true };
    } catch (error) {
      console.error('알림 초기화 중 오류:', error);
      return { success: false, message: error.toString() };
    }
  });

  // 로그인 테스트 핸들러
  ipcMain.handle('test-login', async () => {
    try {
      const result = await ensureLoggedIn();
      return { success: result, message: result ? '로그인 성공' : '로그인 실패' };
    } catch (error) {
      console.error('로그인 테스트 중 오류:', error);
      return { success: false, message: error.toString() };
    }
  });
}
