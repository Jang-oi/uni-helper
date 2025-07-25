import { app, BrowserWindow, ipcMain, Notification, shell } from 'electron';
import Store from 'electron-store';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

// ES 모듈에서는 __dirname이 없으므로 직접 생성
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
const { autoUpdater } = require('electron-updater');

// 상수 정의
const SUPPORT_URL = 'https://114.unipost.co.kr/home.uni';
const BUSINESS_HOURS_START = 7; // 오전 7시
const BUSINESS_HOURS_END = 20; // 오후 8시

// 상태 관리
const store = new Store();
let mainWindow, dataWindow;
let isMonitoring = false;
let monitoringInterval = null;
let isLoggedIn = false;
// 알림 객체를 전역으로 저장할 배열 (가비지 컬렉션 방지)
const activeNotifications = [];

// 메인 윈도우 설정 함수
export function setMainWindow(window) {
  mainWindow = window;

  registerIpcHandlers();
  setupAutoUpdater();
}

// 자동 업데이트 설정
function setupAutoUpdater() {
  // 업데이트 로그 설정
  autoUpdater.logger = console;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // 업데이트 이벤트 리스너 설정
  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus('checking');
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus('available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    sendUpdateStatus('not-available', info);
  });

  autoUpdater.on('error', (err) => {
    sendUpdateStatus('error', { error: err.toString() });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendUpdateStatus('progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus('downloaded', info);
  });
}

// IPC 핸들러 등록
function registerIpcHandlers() {
  function getAlerts() {
    try {
      // 저장된 모든 알림 가져오기
      const allAlerts = store.get('alerts') || [];
      const personalRequests = store.get('personalRequests') || [];
      // 마지막 확인 시간
      const lastChecked = store.get('lastChecked') || null;

      return { success: true, alerts: allAlerts, personalRequests, lastChecked };
    } catch (error) {
      console.error('알림 목록 조회 중 오류:', error);
      return { success: false, error: error.toString() };
    }
  }

  // 현재 모니터링 상태 확인 함수
  function getMonitoringStatus() {
    return {
      isMonitoring,
      monitoringPaused: store.get('monitoringPaused') || false,
      lastChecked: store.get('lastChecked') || null,
    };
  }

  // 시작 프로그램 설정 함수
  function setStartupProgram(enable) {
    try {
      app.setLoginItemSettings({ openAtLogin: enable });

      return { success: true, message: enable ? '시작 프로그램에 등록되었습니다.' : '시작 프로그램에서 제거되었습니다.' };
    } catch (error) {
      console.error('시작 프로그램 설정 중 오류:', error);
      return { success: false, message: error.toString() };
    }
  }

  // 현재 시작 프로그램 설정 상태 확인
  function getStartupStatus() {
    try {
      const status = app.getLoginItemSettings();
      return { success: true, openAtLogin: status.openAtLogin };
    } catch (error) {
      console.error('시작 프로그램 상태 확인 중 오류:', error);
      return { success: false, message: error.toString() };
    }
  }

  // 설정 관련 핸들러
  ipcMain.handle('get-settings', async () => {
    const settings = store.get('settings') || {};
    // 시작 프로그램 상태 확인 및 추가
    const startupStatus = getStartupStatus();
    if (startupStatus.success) {
      settings.startAtLogin = startupStatus.openAtLogin;
    }
    return settings;
  });

  // 모니터링 상태 확인 핸들러 추가
  ipcMain.handle('get-monitoring-status', () => {
    return getMonitoringStatus();
  });

  ipcMain.handle('save-settings', async (event, settings) => {
    try {
      // 시작 프로그램 설정 적용
      if (settings.hasOwnProperty('startAtLogin')) setStartupProgram(settings.startAtLogin);

      store.set('settings', settings);
      return { success: true };
    } catch (error) {
      console.error('설정 저장 중 오류:', error);
      return { success: false, message: error.toString() };
    }
  });

  // 모니터링 관련 핸들러
  ipcMain.handle('toggle-monitoring', async (event, status) => {
    if (status) return startMonitoring();
    else return stopMonitoring();
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

  ipcMain.handle('get-alerts', getAlerts);

  // 앱 정보 핸들러
  ipcMain.handle('get-app-info', () => {
    return { version: app.getVersion() };
  });

  // 업데이트 관련 핸들러
  ipcMain.handle('check-for-updates', async () => {
    try {
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (error) {
      console.error('업데이트 확인 중 오류:', error);
      sendUpdateStatus('error', { error: error.toString() });
      return { success: false, message: error.toString() };
    }
  });

  ipcMain.handle('download-update', async () => {
    try {
      autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('업데이트 다운로드 중 오류:', error);
      return { success: false, message: error.toString() };
    }
  });

  ipcMain.handle('install-update', () => {
    try {
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    } catch (error) {
      console.error('업데이트 설치 중 오류:', error);
      return { success: false, message: error.toString() };
    }
  });
}

// 업데이트 상태 전송 함수
function sendUpdateStatus(status, data = {}) {
  if (mainWindow) mainWindow.webContents.send('update-status', { status, ...data });
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

  isMonitoring = false;
  isLoggedIn = false;
  store.set('monitoringPaused', true); // 일시 중지 상태 저장
}

// 모니터링 재개 (업무 시간)
async function resumeMonitoring() {
  const settings = store.get('settings');
  if (!settings) return;

  // 모니터링 재개
  const interval = settings.checkInterval * 60 * 1000;

  // 모니터링 인터벌 재개
  monitoringInterval = setInterval(checkForNewRequests, interval);
  isMonitoring = true;
  store.delete('monitoringPaused'); // 일시 중지 상태 제거
}

// 로그인 확인 함수
async function ensureLoggedIn() {
  // 이미 로그인 상태면 바로 반환
  if (isLoggedIn) return { success: true, message: '로그인 성공 ' };

  // 설정 확인
  const settings = store.get('settings');
  if (!settings || !settings.username || !settings.password) return false;
  // 로그인 시도
  const { success, message } = await performLogin(settings.username, settings.password);
  isLoggedIn = success;

  return { success, message };
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
  const { success, message } = await ensureLoggedIn();
  if (!success) {
    console.error('데이터 스크래핑을 위한 로그인 실패');
    return { success: false, message: message, allRequests: [], personalRequests: [] };
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
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // iframe 내 데이터 스크래핑
    const result = await dataWindow.webContents.executeJavaScript(`
      (async function() {
        function waitForLoadingToFinish(iframeDoc) {
          return new Promise((resolve) => {
            const loadingArea = iframeDoc.querySelector('.loading-area');
            if (!loadingArea) {
              resolve(); // 로딩 표시가 없으면 즉시 완료
              return;
            }
    
            const checkDisplay = () => {
              const style = window.getComputedStyle(loadingArea);
              if (style.display === 'none') {
                clearInterval(interval);
                resolve();
              }
            };
    
            const interval = setInterval(checkDisplay, 100);
            checkDisplay();
          });
        }
    
        try {
          const li = document.querySelector('li[title="요청내역관리"], li[name="요청내역관리"]');
          if (!li) return { success: false, message: "요청내역관리 탭을 찾을 수 없습니다" };
          
          const tabId = li.getAttribute('aria-controls');
          const iframe = document.getElementById(tabId);
          if (!iframe || !iframe.contentWindow) return { success: false, message: "iframe을 찾을 수 없습니다" };
          
          iframe.contentWindow.UNIUX.SVC('PROGRESSION_TYPE', 'R,E,O,A,C,N,M');
          iframe.contentWindow.UNIUX.SVC(
            'START_DATE',
            new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]
          );
    
          iframe.contentDocument.querySelector('#doSearch').click();
    
          await waitForLoadingToFinish(iframe.contentDocument);
    
          const grid = iframe.contentWindow.grid;
          const allRequestsData = grid.getAllRowValue();
          
          const currentUsername = document.querySelector('.userNm').textContent.trim();
          iframe.contentWindow.UNIUX.SVC('RECEIPT_INFO_SEARCH_TYPE', 'P');
          iframe.contentWindow.UNIUX.SVC('RECEIPT_INFO_TEXT', currentUsername);
    
          iframe.contentDocument.querySelector('#doSearch').click();
          await waitForLoadingToFinish(iframe.contentDocument);
          const personalRequestsData = grid.getAllRowValue();
          
           return { success: true, allRequestsData, personalRequestsData };
        } catch (error) {
          return { success: false, message: "데이터 스크래핑 오류: " + error.message };
        }
      })();
    `);

    if (result.success) {
      return { success: true, allRequests: result.allRequestsData, personalRequests: result.personalRequestsData };
    } else {
      console.error('데이터 스크래핑 실패:', result.message);
      return { success: false, message: result.message, allRequests: [], personalRequests: [] };
    }
  } catch (error) {
    console.error('데이터 스크래핑 중 오류:', error);
    return { success: false, message: error.toString(), allRequests: [], personalRequests: [] };
  } finally {
    if (!dataWindow.isDestroyed()) {
      dataWindow.close();
    }
  }
}

/**
 * 각 알림 항목에 상태 플래그를 추가하는 함수
 * @param {Object} alert - 알림 항목
 * @returns {Object} - 플래그가 추가된 알림 항목
 */
function addStatusFlags(alert) {
  // 알림 항목 복사
  const alertWithFlags = { ...alert };

  // 플래그 추가
  // 1. 긴급 요청 (제목에 "긴급" 포함)
  alertWithFlags.isUrgent = alertWithFlags.REQ_TITLE && alertWithFlags.REQ_TITLE.includes('긴급');

  // 2. 처리 지연 (1주일 이상 소요)
  alertWithFlags.isDelayed = false;
  if (alertWithFlags.PROCESS_DATE) {
    const processTime = new Date(alertWithFlags.PROCESS_DATE).getTime();
    const todayTime = new Date().getTime();
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    alertWithFlags.isDelayed = todayTime - processTime > weekInMs;
  }

  // 3. 접수 후 1시간 이상 미처리
  alertWithFlags.isPending = false;
  if (alertWithFlags.STATUS.includes('접수') && alertWithFlags.REQ_DATE_ALL) {
    const reqTime = new Date(alertWithFlags.REQ_DATE_ALL).getTime();
    const currentTime = new Date().getTime();
    const hourInMs = 60 * 60 * 1000;
    alertWithFlags.isPending = currentTime - reqTime > hourInMs;
  }

  return alertWithFlags;
}
/**
 * 알림 정렬 함수
 * 우선순위: 고객사답변 → 처리중 → 긴급요청 → 처리지연 → 접수후 1시간 미처리 → 최신순
 * @param {Array} alerts - 정렬할 알림 배열
 * @returns {Array} - 정렬된 알림 배열
 */
function sortAlerts(alerts) {
  // 각 알림 항목에 플래그 추가
  const alertsWithFlags = alerts.map((alert) => addStatusFlags(alert));

  return alertsWithFlags.sort((a, b) => {
    // 상태에 따른 우선순위 점수 부여
    const getPriorityScore = (alert) => {
      const status = alert.STATUS;

      // 정확한 상태 매칭을 위한 우선순위 점수
      if (status === '고객사답변') return 100;
      if (status === '처리중') return 90;

      // 긴급 요청
      if (alert.isUrgent) return 80;

      // 처리 지연
      if (alert.isDelayed) return 70;

      // 접수 후 1시간 이상 미처리
      if (alert.isPending) return 60;

      return 0;
    };

    const aPriority = getPriorityScore(a);
    const bPriority = getPriorityScore(b);

    // 우선순위가 다르면 우선순위 기준으로 정렬
    if (aPriority !== bPriority) {
      return bPriority - aPriority; // 높은 점수가 위로 오도록 내림차순 정렬
    }

    // 우선순위가 같으면 요청일시 기준 내림차순 정렬 (최신순)
    return new Date(b.REQ_DATE_ALL).getTime() - new Date(a.REQ_DATE_ALL).getTime();
  });
}

/**
 * 새 요청 사항을 확인하는 모니터링 함수
 * 완료된 상태의 항목은 제외하고 저장
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
async function checkForNewRequests() {
  try {
    // 업무 시간 체크
    const withinBusinessHours = await checkBusinessHours();

    if (!withinBusinessHours) {
      isLoggedIn = false;
      console.log('업무 시간이 아니므로 모니터링 건너뜀');
      return { success: false, message: '업무 시간이 아닙니다' };
    }

    // 현재 시간 설정
    const now = new Date();
    const nowString = now.toLocaleString();

    // 스크래핑 데이터 가져오기
    const result = await scrapeDataFromSite();

    // 마지막 확인 시간 업데이트
    store.set('lastChecked', nowString);

    if (!result.success) return { success: false, message: result.message };

    const { allRequests, personalRequests } = result;
    if (!allRequests || allRequests.length === 0) return { success: true, message: '새로운 데이터가 없습니다' };
    // 기존 알림 불러오기
    const existingAlerts = store.get('alerts') || [];
    // 모든 요청 데이터 형식화
    const formattedAllRequests = allRequests.map(formatRequestData);
    // 새 알림 찾기 - 기존 알림에 없는 SR_IDX를 가진 항목들
    const newAlerts = formattedAllRequests.filter(
      (newAlert) => !existingAlerts.some((existingAlert) => existingAlert.SR_IDX === newAlert.SR_IDX),
    );

    // 상태가 변경된 알림 찾기 (고객사답변으로 변경된 경우)
    const statusChangedAlerts = formattedAllRequests.filter((newAlert) => {
      const existingAlert = existingAlerts.find((existingAlert) => existingAlert.SR_IDX === newAlert.SR_IDX);

      // 기존 알림이 있고, 상태가 변경되었으며, 새 상태가 '고객사답변'인 경우
      return existingAlert && existingAlert.STATUS !== newAlert.STATUS && newAlert.STATUS === '고객사답변';
    });

    const alertsWithFlags = formattedAllRequests.map((alert) => addStatusFlags(alert));
    const personalRequestsWithFlags = personalRequests.map((alert) => addStatusFlags(alert));

    // 알림 정렬 후 저장 (우선순위에 따라 정렬)
    store.set('alerts', alertsWithFlags);
    store.set('personalRequests', personalRequestsWithFlags);

    // 메인 윈도우에 알림 이벤트 전송
    if (mainWindow) mainWindow.webContents.send('new-alerts-available');

    // 최초 실행 시 알람이 여러번 발생하여 제어를 위해
    if (existingAlerts.length > 0) displayNotifications(newAlerts);
    // 상태가 고객사답변으로 변경된 알림에 대해 별도 알림 표시
    if (statusChangedAlerts.length > 0) displayNotifications(statusChangedAlerts);
    return {
      success: true,
      message: `${formattedAllRequests.length}개 항목 업데이트 (${newAlerts.length}개 신규, ${statusChangedAlerts.length}개 고객사답변 상태 변경)`,
    };
  } catch (error) {
    console.error('모니터링 중 오류:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 요청 데이터 형식화 함수
 * @param {Object} item - 원본 요청 항목
 * @returns {Object} - 형식화된 요청 항목
 */
function formatRequestData(item) {
  return {
    SR_IDX: item['SR_IDX'],
    REQ_TITLE: item['REQ_TITLE'],
    CM_NAME: item['CM_NAME'],
    STATUS: item['STATUS'],
    WRITER: item['WRITER'],
    REQ_DATE: item['REQ_DATE'],
    REQ_DATE_ALL: item['REQ_DATE_ALL'],
    PROCESS_DATE: item['PROCESS_DATE'],
  };
}

/**
 * 시스템 알림을 표시하는 함수
 * @param {Array} alerts - 표시할 알림 목록
 */
function displayNotifications(alerts) {
  // 설정에서 알림 활성화 여부 확인
  const settings = store.get('settings') || {};
  // 알림이 비활성화되어 있으면 표시하지 않음
  if (!settings.enableNotifications) return;

  // 오래된 알림 참조 정리 (2분 이상 지난 알림)
  const now = Date.now();
  const twoMinutesInMs = 2 * 60 * 1000;

  // 오래된 알림 필터링하여 제거
  while (activeNotifications.length > 0 && now - activeNotifications[0].createdAt > twoMinutesInMs) {
    activeNotifications.shift();
  }

  alerts.forEach((alert) => {
    const notification = new Notification({
      title: `${alert.CM_NAME}`,
      body: `${alert.REQ_TITLE}\n상태: ${alert.STATUS}\n`,
      icon: path.join(__dirname, 'assets', 'icon.ico'),
    });
    // 생성 시간과 참조하는 SR_IDX 저장
    const notificationObj = {
      notification: notification,
      srIdx: alert.SR_IDX,
      createdAt: Date.now(),
    };

    notification.on('click', async () => {
      await openUniPost(alert.SR_IDX);
      if (mainWindow && process.platform === 'win32') mainWindow.flashFrame(false);
    });
    // 알림 표시
    notification.show();

    // 활성 알림 배열에 추가
    activeNotifications.push(notificationObj);
  });

  // Windows에서만 작업 표시줄 아이콘 깜빡임 시작
  if (mainWindow && alerts.length > 0 && process.platform === 'win32') mainWindow.flashFrame(true);

  // 알림 객체 정리를 위한 타이머 설정 (30초 후)
  setTimeout(() => {
    // 현재 시간 기준으로 활성 상태인 알림 확인
    const currentTime = Date.now();

    // 활성 알림 배열에서 제거할 항목 인덱스 찾기
    const removeIndices = [];
    activeNotifications.forEach((item, index) => {
      // 30초 이상 지났거나 이미 파괴된 알림 객체 식별
      const isExpired = currentTime - item.createdAt > 30000;
      const isDestroyed = item.notification && item.notification.isDestroyed && item.notification.isDestroyed();

      if (isExpired || isDestroyed) removeIndices.unshift(index); // 역순으로 인덱스 추가 (제거 시 인덱스 변화 방지)
    });

    // 식별된 항목 제거
    removeIndices.forEach((index) => {
      activeNotifications.splice(index, 1);
    });
  }, 30000);
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

  // 업무 시간 체크
  const withinBusinessHours = await checkBusinessHours();

  if (!withinBusinessHours) {
    // 업무 시간이 아니면 일시 중지 상태로 저장하고 다음 업무 시간에 자동 시작
    isLoggedIn = false;
    store.set('monitoringPaused', true);
    return { success: false, message: '업무 시간(07:00~20:00)이 아닙니다. 다음 업무 시간에 시작 해주세요.' };
  }

  // 분을 밀리초로 변환
  const interval = settings.checkInterval * 60 * 1000;

  // 초기 체크 (로그인 포함)
  const { success, message } = await ensureLoggedIn();
  if (!success) {
    console.error('모니터링 시작 실패: 로그인할 수 없습니다');
    return { success, message };
  }

  try {
    // 로그인 성공 시 첫 번째 데이터 체크 실행
    const initialCheck = await checkForNewRequests();
    if (!initialCheck.success && initialCheck.message !== '업무 시간이 아닙니다') {
      return { success: false, message: `초기 데이터 확인 실패: ${initialCheck.message || initialCheck.error}` };
    }

    // 데이터 모니터링 인터벌 설정
    monitoringInterval = setInterval(checkForNewRequests, interval);

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

  isMonitoring = false;
  store.delete('monitoringPaused'); // 일시 중지 상태 제거

  return { success: true, message: '모니터링이 중지되었습니다.' };
}
