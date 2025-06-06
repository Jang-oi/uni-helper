import { contextBridge, ipcRenderer } from 'electron';

// 보안 채널 목록
const validChannels = [
  // 설정 관련
  'get-settings',
  'save-settings',

  // 모니터링 관련
  'toggle-monitoring',
  'get-alerts',
  'get-monitoring-status',

  // 알림 상태 관련
  'open-request',
  'new-alerts-available',

  // 프로그램 관련
  'get-app-info',
  'check-for-updates',
  'download-update',
  'install-update',
  'update-status',
];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // 단방향 메시지 전송 (renderer -> main)
  send: (channel, data) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  // 이벤트 리스너 등록 (main -> renderer)
  receive: (channel, func) => {
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);

      // 컴포넌트 언마운트 시 이벤트 리스너 제거를 위한 함수 반환
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  },

  // 'on' 메서드 추가 (receive와 동일하지만 이름을 더 직관적으로)
  on: (channel, func) => {
    if (validChannels.includes(channel)) {
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  },

  // 양방향 통신 (renderer -> main -> renderer)
  invoke: (channel, data) => {
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`));
  },
});
