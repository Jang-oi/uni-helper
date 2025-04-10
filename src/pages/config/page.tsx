import type React from "react"

import { useState } from "react"
import { RefreshCw, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CrawlerConfigPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [config, setConfig] = useState({
        username: "",
        password: "",
        refreshInterval: "15",
        notifyOnNew: true,
        notifyOnUpdate: true,
        autoStart: true,
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target
        setConfig({
            ...config,
            [name]: type === "checkbox" ? checked : value,
        })
    }

    const handleSelectChange = (name: string, value: string) => {
        setConfig({
            ...config,
            [name]: value,
        })
    }

    const handleSwitchChange = (name: string, checked: boolean) => {
        setConfig({
            ...config,
            [name]: checked,
        })
    }

    const handleSave = async () => {
        setIsLoading(true)
        try {
            // Here you would save the configuration to electron store or similar
            await new Promise((resolve) => setTimeout(resolve, 800))
            toast.success("설정 저장 완료", {
                description: "크롤링 설정이 저장되었습니다.",
            })
        } catch (error) {
            toast.error("설정 저장 실패", {
                description: "설정을 저장하는 중 오류가 발생했습니다.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const testConnection = async () => {
        if (!config.username || !config.password) {
            toast.error("입력 오류", {
                description: "아이디와 비밀번호를 모두 입력해주세요.",
            })
            return
        }

        setIsTesting(true)
        try {
            // Here you would test the connection to the work site
            await new Promise((resolve) => setTimeout(resolve, 1500))
            toast.success("연결 테스트 성공", {
                description: "업무 사이트에 성공적으로 연결되었습니다.",
            })
        } catch (error) {
            toast.error("연결 테스트 실패", {
                description: "업무 사이트 연결에 실패했습니다. 자격 증명을 확인해주세요.",
            })
        } finally {
            setIsTesting(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto">
            <Tabs defaultValue="credentials" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="credentials">자격 증명</TabsTrigger>
                    <TabsTrigger value="notifications">알림 설정</TabsTrigger>
                </TabsList>

                <TabsContent value="credentials">
                    <Card>
                        <CardHeader>
                            <CardTitle>업무 사이트 자격 증명</CardTitle>
                            <CardDescription>
                                내부 업무 사이트에 접속하기 위한 아이디와 비밀번호를 입력하세요. 입력된 정보는 로컬에 안전하게
                                저장됩니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">아이디</Label>
                                <Input
                                    id="username"
                                    name="username"
                                    placeholder="업무 사이트 아이디"
                                    value={config.username}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">비밀번호</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="업무 사이트 비밀번호"
                                    value={config.password}
                                    onChange={handleChange}
                                />
                            </div>
                            <Button variant="outline" className="w-full" onClick={testConnection} disabled={isTesting}>
                                {isTesting ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        연결 테스트 중...
                                    </>
                                ) : (
                                    "연결 테스트"
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle>알림 설정</CardTitle>
                            <CardDescription>크롤링 주기와 알림 방식을 설정하세요.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="refreshInterval">크롤링 주기</Label>
                                <Select
                                    value={config.refreshInterval}
                                    onValueChange={(value) => handleSelectChange("refreshInterval", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="크롤링 주기 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5분</SelectItem>
                                        <SelectItem value="15">15분</SelectItem>
                                        <SelectItem value="30">30분</SelectItem>
                                        <SelectItem value="60">1시간</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="notifyOnNew">새 항목 알림</Label>
                                        <p className="text-sm text-muted-foreground">새로운 업무 항목이 등록되면 알림을 받습니다.</p>
                                    </div>
                                    <Switch
                                        id="notifyOnNew"
                                        checked={config.notifyOnNew}
                                        onCheckedChange={(checked) => handleSwitchChange("notifyOnNew", checked)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="notifyOnUpdate">업데이트 알림</Label>
                                        <p className="text-sm text-muted-foreground">기존 항목이 업데이트되면 알림을 받습니다.</p>
                                    </div>
                                    <Switch
                                        id="notifyOnUpdate"
                                        checked={config.notifyOnUpdate}
                                        onCheckedChange={(checked) => handleSwitchChange("notifyOnUpdate", checked)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="autoStart">시작 시 자동 실행</Label>
                                        <p className="text-sm text-muted-foreground">프로그램 시작 시 자동으로 크롤링을 시작합니다.</p>
                                    </div>
                                    <Switch
                                        id="autoStart"
                                        checked={config.autoStart}
                                        onCheckedChange={(checked) => handleSwitchChange("autoStart", checked)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="mt-6 flex justify-end">
                <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? (
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
        </div>
    )
}
