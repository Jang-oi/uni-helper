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
const SESSION_CHECK_INTERVAL = 50 * 60 * 1000; // 50분 (사이트 세션 만료 시간 1시간보다 짧게)
const BUSINESS_HOURS_START = 7; // 오전 7시
const BUSINESS_HOURS_END = 20; // 오후 8시

// 상태 관리
const store = new Store();
let mainWindow, dataWindow;
let isMonitoring = false;
let monitoringInterval = null;
let sessionCheckInterval = null;
let businessHoursCheckInterval = null;
let isLoggedIn = false;

// 메인 윈도우 설정 함수
export function setMainWindow(window) {
  mainWindow = window;
}

// 외부 링크 열기
const openUniPost = async (srIdx) => {
  await shell.openExternal(`${SUPPORT_URL}?access=list&srIdx=${srIdx}`);
};

// 현재 시간이 업무 시간인지 확인 (평일 07:00 ~ 20:00)
function isBusinessHours() {
  const now = new Date();
  const hours = now.getHours();
  const day = now.getDay(); // 0: 일요일, 6: 토요일

  // 주말(토,일) 체크
  if (day === 0 || day === 6) return false;

  return hours >= BUSINESS_HOURS_START && hours < BUSINESS_HOURS_END;
}

// 업무 시간 체크 및 모니터링 상태 관리
async function checkBusinessHours() {
  const settings = store.get('settings') || {};
  const businessHoursOnly = settings.businessHoursOnly !== false; // 기본값은 true

  if (!businessHoursOnly) return true; // 업무 시간 제한이 꺼져 있으면 항상 true

  const withinBusinessHours = isBusinessHours();

  // 모니터링 중이고 업무 시간이 아닌 경우 모니터링 일시 중지
  if (isMonitoring && !withinBusinessHours) {
    console.log('업무 시간이 아니므로 모니터링 일시 중지');
    await pauseMonitoring();
  }
  // 모니터링이 일시 중지되어 있고 업무 시간인 경우 모니터링 재개
  else if (!isMonitoring && withinBusinessHours && store.get('monitoringPaused')) {
    console.log('업무 시간이므로 모니터링 재개');
    await resumeMonitoring();
  }

  return withinBusinessHours;
}

// 모니터링 일시 중지 (업무 시간 외)
async function pauseMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }

  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }

  isMonitoring = false;
  store.set('monitoringPaused', true); // 일시 중지 상태 저장

  // 메인 윈도우에 상태 변경 알림
  if (mainWindow) {
    mainWindow.webContents.send('monitoring-status-changed', false);
    mainWindow.webContents.send('business-hours-notification', '업무 시간(07:00~20:00)이 아니므로 모니터링이 일시 중지되었습니다.');
  }
}

// 모니터링 재개 (업무 시간)
async function resumeMonitoring() {
  const settings = store.get('settings');
  if (!settings) return;

  // 모니터링 재개
  const interval = settings.checkInterval * 60 * 1000;

  // 세션 체크 재개
  sessionCheckInterval = setInterval(ensureLoggedIn, SESSION_CHECK_INTERVAL);

  // 모니터링 인터벌 재개
  monitoringInterval = setInterval(checkForNewRequests, interval);
  isMonitoring = true;
  store.delete('monitoringPaused'); // 일시 중지 상태 제거

  // 메인 윈도우에 상태 변경 알림
  if (mainWindow) {
    mainWindow.webContents.send('monitoring-status-changed', true);
    mainWindow.webContents.send('business-hours-notification', '업무 시간이 시작되어 모니터링이 재개되었습니다.');
  }
}

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
  // 업무 시간 체크
  const settings = store.get('settings') || {};
  const businessHoursOnly = settings.businessHoursOnly !== false;

  if (businessHoursOnly && !isBusinessHours()) {
    console.log('업무 시간이 아니므로 스크래핑 건너뜀');
    return { success: false, message: '업무 시간이 아닙니다', data: [] };
  }

  // 로그인 상태 확인 및 필요시 로그인
  const loggedIn = await ensureLoggedIn();
  if (!loggedIn) {
    console.error('데이터 스크래핑을 위한 로그인 실패');
    return { success: false, message: '로그인 실패', data: [] };
  }

  dataWindow = new BrowserWindow({
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
      const existingIds = new Set(existingAlerts.map((alert) => alert.SR_IDX));

      // 각 데이터 항목을 알림으로 변환
      const alerts = data.map((item) => ({
        SR_IDX: item['SR_IDX'],
        REQ_TITLE: item['REQ_TITLE'],
        CN_NAME: item['CN_NAME'],
        STATUS: item['STATUS'],
        WRITER: item['WRITER'],
        REQ_DATE: item['REQ_DATE'],
        REQ_DATE_ALL: item['REQ_DATE_ALL'],
        isNew: true,
      }));

      // 앱 최초 실행 시 오늘 날짜 이후 데이터만 필터링
      const isFirstRun = !store.has('alerts');
      let filteredAlerts = alerts;

      if (isFirstRun) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 오늘 자정으로 설정

        filteredAlerts = alerts.filter((alert) => {
          // REQ_DATE_ALL 형식: "2023-04-11 14:30:00"
          const alertDate = new Date(alert.REQ_DATE_ALL);
          return alertDate >= today;
        });

        console.log(`최초 실행: 오늘(${today.toLocaleDateString()}) 이후 알림만 표시 (${filteredAlerts.length}/${alerts.length})`);
      }

      // 새로운 알림만 필터링
      const newAlerts = filteredAlerts.filter((alert) => !existingIds.has(alert.SR_IDX));

      if (newAlerts.length > 0) {
        // 새 알림을 저장소에 추가
        store.set('alerts', [...newAlerts, ...existingAlerts]);

        newAlerts.forEach((alert) => {
          const notification = new Notification({
            title: `📬 ${alert.REQ_TITLE}`,
            body: `💡 상태: ${alert.STATUS}\n🕒 요청 시간: ${alert.REQ_DATE_ALL}`,
          });

          // 클릭하면 브라우저 열기 및 읽음 처리
          notification.on('click', () => {
            openUniPost(alert.SR_IDX);

            // 알림 읽음 처리
            const alerts = store.get('alerts') || [];
            const updatedAlerts = alerts.map((a) => (a.SR_IDX === alert.SR_IDX ? { ...a, isNew: false, isRead: true } : a));
            store.set('alerts', updatedAlerts);

            // 메인 윈도우에 알림 상태 변경 알림
            if (mainWindow) {
              mainWindow.webContents.send('alert-marked-as-read', alert.SR_IDX);
            }
          });

          // 알림 표시
          notification.show();

          // 렌더러에 알림 전송
          if (mainWindow) mainWindow.webContents.send('new-alert', alert);
        });
      }

      return { success: true, newAlerts: newAlerts.length };
    }

    return { success: true, newAlerts: 0 };
  } catch (error) {
    console.error('모니터링 중 오류:', error);
    return { success: false, error: error.toString() };
  }
}

// 모니터링 설정 업데이트
async function updateMonitoringSettings() {
  if (!isMonitoring) return { success: true, message: '모니터링이 실행 중이 아닙니다.' };

  // 기존 인터벌 정리
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }

  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }

  // 설정 가져오기
  const settings = store.get('settings');
  if (!settings || !settings.checkInterval) {
    return { success: false, message: '설정 정보가 없습니다.' };
  }

  // 분을 밀리초로 변환
  const interval = settings.checkInterval * 60 * 1000;

  // 업무 시간 체크
  const withinBusinessHours = await checkBusinessHours();
  const businessHoursOnly = settings.businessHoursOnly !== false;

  if (businessHoursOnly && !withinBusinessHours) {
    // 업무 시간이 아니면 모니터링 일시 중지
    await pauseMonitoring();
    return { success: true, message: '업무 시간이 아니므로 모니터링이 일시 중지되었습니다.' };
  }

  // 세션 체크 인터벌 설정
  sessionCheckInterval = setInterval(ensureLoggedIn, SESSION_CHECK_INTERVAL);

  // 모니터링 인터벌 설정
  monitoringInterval = setInterval(checkForNewRequests, interval);

  return { success: true, message: '모니터링 설정이 업데이트되었습니다.' };
}

// 모니터링 시작 함수
async function startMonitoring() {
  // 이미 실행 중인 인터벌 정리
  if (monitoringInterval) clearInterval(monitoringInterval);
  if (sessionCheckInterval) clearInterval(sessionCheckInterval);
  if (businessHoursCheckInterval) clearInterval(businessHoursCheckInterval);

  // 설정 확인
  const settings = store.get('settings');
  if (!settings || !settings.checkInterval) {
    return { success: false, message: '설정 정보가 없습니다.' };
  }

  // 업무 시간 체크
  const withinBusinessHours = await checkBusinessHours();
  const businessHoursOnly = settings.businessHoursOnly !== false;

  if (businessHoursOnly && !withinBusinessHours) {
    // 업무 시간이 아니면 일시 중지 상태로 저장하고 다음 업무 시간에 자동 시작
    store.set('monitoringPaused', true);

    // 업무 시간 체크 인터벌 설정 (1분마다)
    businessHoursCheckInterval = setInterval(checkBusinessHours, 60000);

    return {
      success: true,
      message: '업무 시간(07:00~20:00)이 아닙니다. 다음 업무 시간에 자동으로 시작됩니다.',
    };
  }

  // 분을 밀리초로 변환
  const interval = settings.checkInterval * 60 * 1000;

  // 초기 체크 (로그인 포함)
  const loggedIn = await ensureLoggedIn();
  if (!loggedIn) {
    console.error('모니터링 시작 실패: 로그인할 수 없습니다');
    if (mainWindow) mainWindow.webContents.send('login-error', '모니터링을 시작할 수 없습니다. 로그인 정보를 확인해주세요.');

    return { success: false, message: '로그인할 수 없습니다. 아이디와 비밀번호를 확인해주세요.' };
  }

  try {
    // 로그인 성공 시 첫 번째 데이터 체크 실행
    const initialCheck = await checkForNewRequests();
    if (!initialCheck.success && initialCheck.message !== '업무 시간이 아닙니다') {
      return { success: false, message: `초기 데이터 확인 실패: ${initialCheck.message || initialCheck.error}` };
    }

    // 세션 만료 방지를 위한 주기적 체크
    // sessionCheckInterval = setInterval(ensureLoggedIn, SESSION_CHECK_INTERVAL);

    // 데이터 모니터링 인터벌 설정
    monitoringInterval = setInterval(checkForNewRequests, interval);

    // 업무 시간 체크 및 세션 유지를 위한 인터벌 설정 (50분마다)
    businessHoursCheckInterval = setInterval(async () => {
      const withinBusinessHours = await checkBusinessHours();

      // 업무 시간 내에만 세션 체크 수행
      if (withinBusinessHours) {
        await ensureLoggedIn();
      }
    }, SESSION_CHECK_INTERVAL);

    isMonitoring = true;
    store.delete('monitoringPaused'); // 일시 중지 상태 제거

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

  if (businessHoursCheckInterval) {
    clearInterval(businessHoursCheckInterval);
    businessHoursCheckInterval = null;
  }

  isMonitoring = false;
  store.delete('monitoringPaused'); // 일시 중지 상태 제거

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

  // 모니터링 설정 업데이트 핸들러
  ipcMain.handle('update-monitoring-settings', async () => {
    return updateMonitoringSettings();
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

  // 알림 읽음 표시 핸들러
  ipcMain.handle('mark-alert-as-read', async (event, srIdx) => {
    try {
      const alerts = store.get('alerts') || [];
      const updatedAlerts = alerts.map((alert) => (alert.SR_IDX === srIdx ? { ...alert, isNew: false, isRead: true } : alert));

      store.set('alerts', updatedAlerts);
      return { success: true };
    } catch (error) {
      console.error('알림 상태 변경 중 오류:', error);
      return { success: false, message: error.toString() };
    }
  });

  // 모든 알림 읽음 표시 핸들러
  ipcMain.handle('mark-all-alerts-as-read', async () => {
    try {
      const alerts = store.get('alerts') || [];
      const updatedAlerts = alerts.map((alert) => ({ ...alert, isNew: false, isRead: true }));

      store.set('alerts', updatedAlerts);
      return { success: true };
    } catch (error) {
      console.error('알림 상태 변경 중 오류:', error);
      return { success: false, message: error.toString() };
    }
  });

  // 요청 상세 보기 핸들러
  ipcMain.handle('open-request', async (event, srIdx) => {
    try {
      await openUniPost(srIdx);
      return { success: true };
    } catch (error) {
      console.error('요청 상세 보기 중 오류:', error);
      return { success: false, message: error.toString() };
    }
  });
}
