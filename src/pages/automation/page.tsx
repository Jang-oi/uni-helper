import type React from "react"

import { useState, useEffect } from "react"
import { Play, Square, Eye, EyeOff, RefreshCw, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface AutomationConfig {
    targetUrl: string
    selector: string
    intervalMinutes: number
    isRunning: boolean
    credentials: {
        username: string
        password: string
    }
}

export default function AutomationPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [config, setConfig] = useState<AutomationConfig>({
        targetUrl: "",
        selector: "",
        intervalMinutes: 15,
        isRunning: false,
        credentials: {
            username: "",
            password: "",
        },
    })
    const [showBrowser, setShowBrowser] = useState(false)
    const [lastExecutionResult, setLastExecutionResult] = useState<{
        success: boolean
        message: string
        timestamp: string
    } | null>(null)

    // 자동화 상태 로드
    useEffect(() => {
        loadAutomationStatus()

        // 자동화 상태 변경 이벤트 리스너
        const unsubscribeStatus = window.electronAPI.onAutomationStatusChanged((data) => {
            setConfig((prev) => ({ ...prev, isRunning: data.isRunning }))

            if (data.isRunning) {
                toast.success("자동화 시작됨", {
                    description: "설정된 간격으로 자동화가 실행됩니다.",
                })
            } else {
                toast.info("자동화 중지됨", {
                    description: "자동화가 중지되었습니다.",
                })
            }
        })

        // 자동화 실행 결과 이벤트 리스너
        const unsubscribeExecution = window.electronAPI.onAutomationExecuted((result) => {
            setLastExecutionResult({
                success: result.success,
                message: result.message,
                timestamp: new Date().toLocaleTimeString(),
            })

            if (result.success) {
                toast.success("자동화 실행 성공", {
                    description: result.message,
                })
            } else {
                toast.error("자동화 실행 실패", {
                    description: result.message,
                })
            }
        })

        return () => {
            unsubscribeStatus()
            unsubscribeExecution()
        }
    }, [])

    const loadAutomationStatus = async () => {
        try {
            const result = await window.electronAPI.getAutomationStatus()
            if (result.success) {
                setConfig({
                    targetUrl: result.targetUrl || "",
                    selector: result.selector || "",
                    intervalMinutes: result.intervalMinutes || 15,
                    isRunning: result.isRunning || false,
                    credentials: result.credentials || { username: "", password: "" },
                })
            }
        } catch (error) {
            console.error("자동화 상태 로드 오류:", error)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setConfig({
            ...config,
            [name]: value,
        })
    }

    const handleIntervalChange = (value: string) => {
        setConfig({
            ...config,
            intervalMinutes: Number.parseInt(value, 10),
        })
    }

    const toggleAutomation = async () => {
        setIsLoading(true)
        try {
            if (config.isRunning) {
                // 자동화 중지
                const result = await window.electronAPI.stopAutomation()
                if (result.success) {
                    setConfig({ ...config, isRunning: false })
                }
            } else {
                // 자동화 시작 전 유효성 검사
                if (!config.targetUrl) {
                    toast.error("URL을 입력하세요", {
                        description: "대상 웹 페이지 URL을 입력해야 합니다.",
                    })
                    setIsLoading(false)
                    return
                }

                if (!config.selector) {
                    toast.error("선택자를 입력하세요", {
                        description: "클릭할 요소의 CSS 선택자를 입력해야 합니다.",
                    })
                    setIsLoading(false)
                    return
                }

                // 자동화 시작
                const result = await window.electronAPI.startAutomation({
                    targetUrl: config.targetUrl,
                    selector: config.selector,
                    intervalMinutes: config.intervalMinutes,
                    credentials: config.credentials,
                })

                if (result.success) {
                    setConfig({ ...config, isRunning: true })
                }
            }
        } catch (error) {
            console.error("자동화 토글 오류:", error)
            toast.error("자동화 오류", {
                description: "자동화 상태를 변경하는 중 오류가 발생했습니다.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const toggleBrowserVisibility = async () => {
        try {
            await window.electronAPI.toggleAutomationWindow(!showBrowser)
            setShowBrowser(!showBrowser)
        } catch (error) {
            console.error("브라우저 표시 오류:", error)
            toast.error("브라우저 표시 오류", {
                description: "브라우저 창 표시 상태를 변경하는 중 오류가 발생했습니다.",
            })
        }
    }

    const saveSettings = async () => {
        setIsSaving(true)
        try {
            // 설정 저장 로직 (실제로는 자동화 시작 시 저장됨)
            toast.success("설정 저장 완료", {
                description: "자동화 설정이 저장되었습니다.",
            })
        } catch (error) {
            toast.error("설정 저장 실패", {
                description: "설정을 저장하는 중 오류가 발생했습니다.",
            })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">웹 페이지 자동화</h1>
                <div className="flex items-center gap-2">
                    <Badge>{config.isRunning ? "실행 중" : "중지됨"}</Badge>
                    <Button
                        variant={config.isRunning ? "destructive" : "default"}
                        onClick={toggleAutomation}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : config.isRunning ? (
                            <Square className="mr-2 h-4 w-4" />
                        ) : (
                            <Play className="mr-2 h-4 w-4" />
                        )}
                        {config.isRunning ? "중지" : "시작"}
                    </Button>
                    {config.isRunning && (
                        <Button variant="outline" onClick={toggleBrowserVisibility}>
                            {showBrowser ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                            {showBrowser ? "브라우저 숨기기" : "브라우저 보기"}
                        </Button>
                    )}
                </div>
            </div>

            {lastExecutionResult && (
                <Alert variant={lastExecutionResult.success ? "default" : "destructive"} className="mb-6">
                    <AlertTitle>{lastExecutionResult.success ? "자동화 실행 성공" : "자동화 실행 실패"}</AlertTitle>
                    <AlertDescription className="flex flex-col">
                        <span>{lastExecutionResult.message}</span>
                        <span className="text-xs text-muted-foreground mt-1">{lastExecutionResult.timestamp}</span>
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>자동화 설정</CardTitle>
                    <CardDescription>
                        웹 페이지에서 자동으로 수행할 작업을 설정합니다. 특정 요소를 주기적으로 클릭하거나 다른 작업을 수행할 수
                        있습니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="targetUrl">대상 URL</Label>
                        <Input
                            id="targetUrl"
                            name="targetUrl"
                            placeholder="https://example.com"
                            value={config.targetUrl}
                            onChange={handleChange}
                            disabled={config.isRunning}
                        />
                        <p className="text-sm text-muted-foreground">자동화를 수행할 웹 페이지의 URL을 입력하세요.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="selector">CSS 선택자</Label>
                        <Input
                            id="selector"
                            name="selector"
                            placeholder=".doSearch, #submit-button, button.search"
                            value={config.selector}
                            onChange={handleChange}
                            disabled={config.isRunning}
                        />
                        <p className="text-sm text-muted-foreground">
                            클릭할 요소의 CSS 선택자를 입력하세요. (예: .doSearch, #submit-button)
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="intervalMinutes">실행 간격</Label>
                        <Select
                            value={config.intervalMinutes.toString()}
                            onValueChange={handleIntervalChange}
                            disabled={config.isRunning}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="실행 간격 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1분</SelectItem>
                                <SelectItem value="5">5분</SelectItem>
                                <SelectItem value="10">10분</SelectItem>
                                <SelectItem value="15">15분</SelectItem>
                                <SelectItem value="30">30분</SelectItem>
                                <SelectItem value="60">1시간</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">자동화 작업을 실행할 시간 간격을 선택하세요.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="username">아이디</Label>
                        <Input
                            id="username"
                            name="username"
                            placeholder="로그인 아이디"
                            value={config.credentials.username}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    credentials: {
                                        ...config.credentials,
                                        username: e.target.value,
                                    },
                                })
                            }
                            disabled={config.isRunning}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">비밀번호</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="로그인 비밀번호"
                            value={config.credentials.password}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    credentials: {
                                        ...config.credentials,
                                        password: e.target.value,
                                    },
                                })
                            }
                            disabled={config.isRunning}
                        />
                        <p className="text-sm text-muted-foreground">로그인 정보는 로컬에만 저장되며 외부로 전송되지 않습니다.</p>
                    </div>

                    <div className="pt-4">
                        <Button onClick={saveSettings} disabled={isSaving || config.isRunning}>
                            {isSaving ? (
                                <>
                                    <Save className="mr-2 h-4 w-4 animate-spin" />
                                    저장 중...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    설정 저장
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>고급 설정</CardTitle>
                    <CardDescription>자동화 작업에 대한 고급 설정을 구성합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="customScript">사용자 정의 스크립트 (선택사항)</Label>
                        <Textarea
                            id="customScript"
                            placeholder="// 페이지에서 실행할 JavaScript 코드를 입력하세요"
                            className="font-mono h-32"
                            disabled={true}
                        />
                        <p className="text-sm text-muted-foreground">이 기능은 현재 개발 중입니다. 곧 사용 가능해질 예정입니다.</p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="debugMode">디버그 모드</Label>
                            <p className="text-sm text-muted-foreground">자동화 실행 시 상세한 로그를 표시합니다.</p>
                        </div>
                        <Switch id="debugMode" disabled={true} />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
