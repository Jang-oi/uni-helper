// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
import {contextBridge, ipcRenderer} from 'electron'

contextBridge.exposeInMainWorld("electronAPI", {
    // 설정 관련 API
    saveConfig: (config) => {
        return ipcRenderer.invoke("save-config", config)
    },
    loadConfig: () => {
        return ipcRenderer.invoke("load-config")
    },
    testConnection: (credentials) => {
        return ipcRenderer.invoke("test-connection", credentials)
    },

    // 크롤링 관련 API
    startCrawling: () => {
        return ipcRenderer.invoke("start-crawling")
    },

    // 알림 관련 API
    getNotifications: () => {
        return ipcRenderer.invoke("get-notifications")
    },
    markAsRead: (notificationId) => {
        return ipcRenderer.invoke("mark-as-read", notificationId)
    },
    markAllAsRead: () => {
        return ipcRenderer.invoke("mark-all-as-read")
    },
    onShowNotification: (callback) => {
        ipcRenderer.on("show-notification", (_, data) => callback(data))
        return () => {
            ipcRenderer.removeAllListeners("show-notification")
        }
    },

    // 자동화 관련 API
    startAutomation: (config) => {
        return ipcRenderer.invoke("start-automation", config)
    },
    stopAutomation: () => {
        return ipcRenderer.invoke("stop-automation")
    },
    toggleAutomationWindow: (show) => {
        return ipcRenderer.invoke("toggle-automation-window", show)
    },
    getAutomationStatus: () => {
        return ipcRenderer.invoke("get-automation-status")
    },

    // 이벤트 리스너
    onAutomationStatusChanged: (callback) => {
        ipcRenderer.on("automation-status-changed", (_, data) => callback(data))
        return () => {
            ipcRenderer.removeAllListeners("automation-status-changed")
        }
    },
    onAutomationExecuted: (callback) => {
        ipcRenderer.on("automation-executed", (_, data) => callback(data))
        return () => {
            ipcRenderer.removeAllListeners("automation-executed")
        }
    },
})
