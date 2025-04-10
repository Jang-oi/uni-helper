import { useEffect } from "react"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { Routes } from "./routes"
import { toast } from "sonner"

export default function App() {
    useEffect(() => {
        // 알림 이벤트 리스너 등록
        const unsubscribe = () => {
            if (window.electronAPI) {
                window.electronAPI.onShowNotification(({ title, body } :any) => {
                    // 시스템 알림 표시 (브라우저 알림 API 사용)
                    if (Notification.permission === "granted") {
                        new Notification(title, {body})
                    } else if (Notification.permission !== "denied") {
                        Notification.requestPermission().then((permission) => {
                            if (permission === "granted") {
                                new Notification(title, {body})
                            }
                        })
                    }

                    // 앱 내 토스트 알림도 표시
                    toast(title, {description: body})
                });
            }
        }

        // 알림 권한 요청
        if (Notification.permission !== "granted" && Notification.permission !== "denied") Notification.requestPermission()

        unsubscribe();
    }, [])

    return (
        <ThemeProvider defaultTheme="light" storageKey="electron-app-theme">
            <Routes />
            <Toaster position="top-right" />
        </ThemeProvider>
    )
}
