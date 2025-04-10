import { contextBridge, ipcRenderer } from "electron"

// 보안 채널 목록
const validSendChannels = [
    "get-settings",
    "save-settings",
    "test-connection",
    "toggle-monitoring",
    "get-monitoring-status",
    "get-alerts",
    "clear-alerts",
]

const validReceiveChannels = ["new-alert"]

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
    send: (channel, data) => {
        if (validSendChannels.includes(channel)) {
            ipcRenderer.send(channel, data)
        }
    },
    receive: (channel, func) => {
        if (validReceiveChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (event, ...args) => func(...args))

            // 컴포넌트 언마운트 시 이벤트 리스너 제거를 위한 함수 반환
            return () => {
                ipcRenderer.removeListener(channel, func)
            }
        }
    },
    invoke: (channel, data) => {
        if (validSendChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data)
        }
        return Promise.reject(new Error(`Invalid channel: ${channel}`))
    },
})
