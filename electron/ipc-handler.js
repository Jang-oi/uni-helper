import { BrowserWindow, ipcMain, Notification, session, shell } from 'electron';
import Store from 'electron-store';
import path from 'path';
import { fileURLToPath } from 'url';

// ES 모듈에서는 __dirname이 없으므로 직접 생성
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store();
let mainWindow;
let isMonitoring = false;
let monitoringInterval = null;
let sessionCheckInterval = null;
let isLoggedIn = false;

// 메인 윈도우 설정 함수
export function setMainWindow(window) {
  mainWindow = window;
}
const openUniPost = () => {
  shell.openExternal('https://114.unipost.co.kr/home.uni');
};

// 로그인 확인 함수
async function ensureLoggedIn() {
  if (isLoggedIn) return true;

  const settings = store.get('settings');
  if (!settings || !settings.username || !settings.password || !settings.workSiteUrl) {
    return false;
  }

  try {
    const result = await performLogin(settings.workSiteUrl, settings.username, settings.password);
    isLoggedIn = result.success;
    return isLoggedIn;
  } catch (error) {
    console.error('로그인 실패:', error);
    return false;
  }
}

// 로그인 수행 함수
async function performLogin(url, username, password) {
  const loginWindow = new BrowserWindow({
    show: process.env.NODE_ENV === 'development',
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  try {
    await loginWindow.loadURL(url);

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
    await new Promise((resolve) => setTimeout(resolve, 5000));

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
    return await window.webContents.executeJavaScript(`
    (function() {
      try {
        // iframe 요소 찾기
        const iframe = document.getElementById('ui-tabs-TM902313') || 
                      document.querySelector('iframe[role="tabpanel"]');
        
        if (!iframe || !iframe.contentDocument) {
          return { success: false, message: "iframe을 찾을 수 없거나 접근할 수 없습니다" };
        }
        
        // iframe 내부에서 요소 검색
        const successEl = iframe.contentDocument.querySelector('.rg-header table tbody .rg-header-renderer');
        const errorEl = iframe.contentDocument.querySelector('.up-alarm-box .up-alarm-message');
        
        if (successEl) {
          return { success: true, message: "로그인 성공" };
        } else if (errorEl && getComputedStyle(document.querySelector("#up-alarm")).display === "block") {
          return { success: false, message: errorEl.textContent.trim() || "로그인 실패" };
        } else {
          // 디버깅 정보 수집
          const iframeContent = iframe.contentDocument.documentElement.outerHTML.substring(0, 500);
          return { 
            success: false, 
            message: "로그인 상태 확인 불가", 
            debug: "iframe 내용 일부: " + iframeContent
          };
        }
      } catch (error) {
        return { success: false, message: "상태 확인 오류: " + error.message };
      }
    })();
  `);
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
    return [];
  }

  console.log(loggedIn);
  const dataWindow = new BrowserWindow({
    show: process.env.NODE_ENV === 'development',
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  try {
    await dataWindow.loadURL('https://114.unipost.co.kr/home.uni');
    await new Promise((resolve) => setTimeout(resolve, 5000));
    // iframe 내 데이터 스크래핑
    const data = await dataWindow.webContents.executeJavaScript(`
      (function() {
            try {
              const iframe = document.getElementById('ui-tabs-TM902313') || document.querySelector('iframe[role="tabpanel"]');
              
              if (!iframe || !iframe.contentDocument)   return { success: false, message: "iframe을 찾을 수 없습니다" };
              
              const doc = iframe.contentDocument;
              
              // 1. 헤더 키 추출
              const headerCells = doc.querySelectorAll('.rg-header table tbody .rg-header-renderer');
              const headers = Array.from(headerCells).map(cell => cell.textContent.trim());
              
              // 2. 바디 데이터 추출
              const rows = doc.querySelectorAll('.rg-body table tbody tr');
              const result = [];
              
              rows.forEach(tr => {
                const tds = tr.querySelectorAll('td');
                const rowData = {};
                
                tds.forEach((td, index) => {
                  const text = td.querySelector('.rg-renderer')?.textContent.trim() || '';
                  const key = headers[index] || \`컬럼\${index + 1}\`;
                  rowData[key] = text;
                });
                
                result.push(rowData);
              });
              
              return { success: true, data: result };
            } catch (error) {
              return { success: false, message: "데이터 스크래핑 오류: " + error.message };
            }
      })();
    `);

    if (data.success) {
      return data.data;
    } else {
      console.error('데이터 스크래핑 실패:', data.message);
      return [];
    }
  } catch (error) {
    console.error('데이터 스크래핑 중 오류:', error);
    return [];
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
    const data = await scrapeDataFromSite();

    // 마지막 확인 시간 업데이트
    store.set('lastChecked', nowString);

    if (data.length > 0) {
      // 이전 데이터와 비교하여 새로운 항목 확인
      const existingAlerts = store.get('alerts') || [];
      const existingIds = new Set(existingAlerts.map((alert) => alert.id));

      // 각 데이터 항목을 알림으로 변환
      const alerts = data.map((item) => ({
        id: item['접수번호'] || item['요청번호'] || `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        title: item['제목'] || item['요청내용'] || '새 요청',
        status: item['처리상태'] || '접수',
        timestamp: item['접수일시'] || item['등록일시'] || nowString,
        isNew: true,
      }));

      // 새로운 알림만 필터링
      // 새로운 알림만 필터링
      const newAlerts = alerts.filter((alert) => !existingIds.has(alert.id) && (!alert.status || alert.status.trim() === '고객사답변'));

      console.log(newAlerts);
      if (newAlerts.length > 0) {
        // 새 알림을 저장소에 추가
        store.set('alerts', [...newAlerts, ...existingAlerts]);

        newAlerts.forEach((alert) => {
          const notification = new Notification({
            title: `📬 새 요청 도착! - ${alert.title}`,
            body: `💡 상태: ${alert.status}\n🕒 도착: ${alert.timestamp}`,
          });

          // 클릭하면 브라우저 열기
          notification.on('click', () => {
            openUniPost();
          });

          // 알림 표시
          notification.show();

          // 렌더러에 알림 전송
          if (mainWindow) {
            mainWindow.webContents.send('new-alert', alert);
          }
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

// 모니터링 시작 함수
function startMonitoring() {
  if (monitoringInterval) clearInterval(monitoringInterval);

  const settings = store.get('settings');
  if (!settings || !settings.checkInterval) return { success: false, message: '설정 정보가 없습니다.' };

  // 분을 밀리초로 변환
  const interval = settings.checkInterval * 60 * 1000;

  // 초기 체크 (로그인 포함)
  ensureLoggedIn().then(async (loggedIn) => {
    if (loggedIn) {
      await checkForNewRequests();
    } else {
      console.error('모니터링 시작 실패: 로그인할 수 없습니다');

      if (mainWindow) {
        mainWindow.webContents.send('login-error', '모니터링을 시작할 수 없습니다. 로그인 정보를 확인해주세요.');
      }
    }
  });

  // 세션 만료 방지를 위한 주기적 체크 (4시간마다)
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }
  sessionCheckInterval = setInterval(
    () => {
      ensureLoggedIn();
    },
    4 * 60 * 60 * 1000,
  );

  // 데이터 모니터링 인터벌 설정
  monitoringInterval = setInterval(checkForNewRequests, interval);
  isMonitoring = true;

  return { success: true };
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
  return { success: true };
}

// 세션 상태 초기화 함수
export function resetSessionState() {
  isLoggedIn = false;
}

// IPC 핸들러 등록
export function registerIpcHandlers() {
  // 기존 IPC 핸들러
  ipcMain.handle('get-settings', async () => {
    return store.get('settings');
  });

  ipcMain.handle('save-settings', async (event, settings) => {
    store.set('settings', settings);
    return { success: true };
  });

  ipcMain.handle('test-connection', async (event, settings) => {
    const { workSiteUrl, username, password } = settings;
    const testSession = session.fromPartition('test-partition');
    await testSession.clearStorageData();

    const testWindow = new BrowserWindow({
      show: process.env.NODE_ENV === 'development',
      width: 1200,
      height: 800,
      webPreferences: {
        session: testSession,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    try {
      await testWindow.loadURL(workSiteUrl);

      // 디버깅을 위해 개발자 도구 열기
      if (process.env.NODE_ENV === 'development') {
        testWindow.webContents.openDevTools({ mode: 'detach' });
      }

      // 페이지 로드 완료까지 대기
      await new Promise((resolve) => testWindow.webContents.once('did-finish-load', resolve));

      // 값 이스케이프 처리
      const escapedUsername = username.replace(/"/g, '\\"');
      const escapedPassword = password.replace(/"/g, '\\"');

      await testWindow.webContents.executeJavaScript(`
        (function() {
          try {
            const usernameField = document.querySelector("#userId");
            const passwordField = document.querySelector("#password");
            const loginButton = document.querySelector("body > div.wrap.login > div > div > div > div > form > fieldset > div.btn-area > button");
            
            if (!usernameField || !passwordField || !loginButton) {
              return "로그인 요소 탐색 실패";
            }
            
            usernameField.value = "${escapedUsername}";
            passwordField.value = "${escapedPassword}";
            loginButton.click();
            
            return "로그인 시도 완료";
          } catch (error) {
            return "스크립트 실행 오류: " + error.message;
          }
        })();
      `);

      // 로그인 시도 후 결과 확인 (간단하게)
      await new Promise((resolve) => setTimeout(resolve, 5000)); // 5초 대기

      return await testWindow.webContents.executeJavaScript(`
    (function() {
      try {
        // iframe 요소 찾기
        const iframe = document.getElementById('ui-tabs-TM902313') || 
                      document.querySelector('iframe[role="tabpanel"]');
        
        if (!iframe || !iframe.contentDocument) {
          return { success: false, message: "iframe을 찾을 수 없거나 접근할 수 없습니다" };
        }
        
        // iframe 내부에서 요소 검색
        const successEl = iframe.contentDocument.querySelector('.rg-header table tbody .rg-header-renderer');
        const errorEl = iframe.contentDocument.querySelector('.up-alarm-box .up-alarm-message');
        
        if (successEl) {
          return { success: true, message: "로그인 성공" };
        } else if (errorEl && getComputedStyle(document.querySelector("#up-alarm")).display === "block") {
          return { success: false, message: errorEl.textContent.trim() || "로그인 실패" };
        } else {
          // 디버깅 정보 수집
          const iframeContent = iframe.contentDocument.documentElement.outerHTML.substring(0, 500);
          return { 
            success: false, 
            message: "로그인 상태 확인 불가", 
            debug: "iframe 내용 일부: " + iframeContent
          };
        }
      } catch (error) {
        return { success: false, message: "상태 확인 오류: " + error.message };
      }
    })();
  `);
    } catch (error) {
      console.error('로그인 테스트 오류:', error);
      return {
        success: false,
        message: error.toString(),
      };
    } finally {
      if (!testWindow.isDestroyed()) {
        testWindow.close();
      }
    }
  });

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

  ipcMain.handle('get-alerts', async () => {
    return {
      alerts: store.get('alerts') || [],
      lastChecked: store.get('lastChecked'),
    };
  });

  ipcMain.handle('clear-alerts', async () => {
    store.set('alerts', []);
    return { success: true };
  });

  // 새로운 IPC 핸들러
  ipcMain.handle('check-session', async () => {
    return { isLoggedIn: isLoggedIn };
  });

  ipcMain.handle('manual-check', async () => {
    return await checkForNewRequests();
  });

  ipcMain.handle('refresh-session', async () => {
    isLoggedIn = false;
    const result = await ensureLoggedIn();
    return { success: result };
  });
}
