import {app, BrowserWindow, ipcMain} from 'electron';
import path from 'node:path';
import Store from 'electron-store'

const __dirname = path.resolve();

// 설정 저장을 위한 Store 초기화
const store = new Store({
    schema: {
        credentials: {
            type: "object",
            properties: {
                workSiteUrl: { type: "string" },
                username: { type: "string" },
                password: { type: "string" },
            },
        },
        settings: {
            type: "object",
            properties: {
                refreshInterval: { type: "string" },
                notifyOnNew: { type: "boolean" },
                notifyOnUpdate: { type: "boolean" },
                autoStart: { type: "boolean" },
            },
        },
    },
})

let mainWindow = null

const createWindow = () => {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.mjs"),
            contextIsolation: true,
            nodeIntegration: false,
        },
        autoHideMenuBar: true,
        show: true,
        resizable: false,
        center: true,
    })

    mainWindow.loadURL("http://localhost:5173")
    // mainWindow.webContents.openDevTools()

    // mainWindow.loadFile(path.join(__dirname, "../dist/index.html"))
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    createWindow()

    // IPC 핸들러 설정
    setupIpcHandlers()

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
    }
})

// IPC 핸들러 설정
function setupIpcHandlers() {
    // 설정 저장
    ipcMain.handle("save-config", async (_, config) => {
        try {
            store.set("credentials", {
                workSiteUrl: config.workSiteUrl,
                username: config.username,
                password: config.password,
            })

            store.set("settings", {
                refreshInterval: config.refreshInterval,
                notifyOnNew: config.notifyOnNew,
                notifyOnUpdate: config.notifyOnUpdate,
                autoStart: config.autoStart,
            })

            return { success: true }
        } catch (error) {
            console.error("설정 저장 오류:", error)
            return { success: false, error: error.message }
        }
    })

    // 설정 불러오기
    ipcMain.handle("load-config", async () => {
        try {
            const credentials = store.get("credentials", {
                workSiteUrl: "https://company-work-site.example.com",
                username: "",
                password: "",
            })

            const settings = store.get("settings", {
                refreshInterval: "15",
                notifyOnNew: true,
                notifyOnUpdate: true,
                autoStart: true,
            })

            return {
                success: true,
                config: {
                    ...credentials,
                    ...settings,
                },
            }
        } catch (error) {
            console.error("설정 불러오기 오류:", error)
            return { success: false, error: error.message }
        }
    })

    // 연결 테스트
    ipcMain.handle("test-connection", async (_, credentials) => {
        try {
            // 여기에 실제 크롤링 로직을 구현하여 연결 테스트
            // 예시로 성공 응답만 반환
            return { success: true }
        } catch (error) {
            console.error("연결 테스트 오류:", error)
            return { success: false, error: error.message }
        }
    })

    // 수동 크롤링 시작
    ipcMain.handle("start-crawling", async () => {
        try {
            // 여기에 실제 크롤링 로직 구현
            // 예시로 성공 응답만 반환
            return { success: true }
        } catch (error) {
            console.error("크롤링 오류:", error)
            return { success: false, error: error.message }
        }
    })

    // 알림 목록 가져오기
    ipcMain.handle("get-notifications", async () => {
        try {
            // 여기에 실제 알림 데이터를 가져오는 로직 구현
            // 예시 데이터 반환
            return {
                success: true,
                notifications: [
                    {
                        id: "1",
                        title: "업무 요청 #1234",
                        message: "새로운 업무 요청이 등록되었습니다. 확인이 필요합니다.",
                        timestamp: "10분 전",
                        read: false,
                        isNew: true,
                        isUpdated: false,
                    },
                    {
                        id: "2",
                        title: "결재 문서 #5678",
                        message: "결재 문서가 승인되었습니다. 다음 단계를 진행해주세요.",
                        timestamp: "1시간 전",
                        read: false,
                        isNew: false,
                        isUpdated: true,
                    },
                    {
                        id: "3",
                        title: "시스템 공지",
                        message: "오늘 18시부터 시스템 점검이 있을 예정입니다. 작업을 미리 저장해주세요.",
                        timestamp: "3시간 전",
                        read: true,
                        isNew: false,
                        isUpdated: false,
                    },
                ],
            }
        } catch (error) {
            console.error("알림 가져오기 오류:", error)
            return { success: false, error: error.message }
        }
    })

    // 알림 읽음 처리
    ipcMain.handle("mark-as-read", async (_, notificationId) => {
        try {
            // 여기에 알림 읽음 처리 로직 구현
            return { success: true }
        } catch (error) {
            console.error("알림 읽음 처리 오류:", error)
            return { success: false, error: error.message }
        }
    })
}
