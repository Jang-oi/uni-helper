"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
    Bell,
    Clock,
    Settings,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    Zap,
    Shield,
    BellRing,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function HomePage() {
    const navigate = useNavigate()
    const [status] = useState({
        isRunning: true,
        lastCrawl: "2023년 4월 9일 15:34",
        nextCrawl: "15분 후",
        newAlerts: 3,
    })

    const handleFeedback = () => {
        toast.success("피드백 제출", {
            description: "피드백이 성공적으로 제출되었습니다. 감사합니다!",
        })
    }

    return (
        <div className="max-w-5xl mx-auto">
            <section className="mb-8 text-center">
                <h1 className="text-3xl font-bold mb-4">업무 알림 시스템</h1>
                <p className="text-lg text-muted-foreground mb-6 max-w-3xl mx-auto">
                    내부 업무 페이지를 자동으로 크롤링하여 중요한 업데이트와 새로운 정보를 실시간으로 알려드립니다.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                    <Button size="lg" onClick={() => navigate("/notifications")}>
                        알림 확인하기
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate("/crawler-config")}>
                        설정 관리하기
                        <Settings className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </section>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            자동 크롤링
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>설정한 주기에 따라 업무 페이지를 자동으로 크롤링하여 최신 정보를 확인합니다.</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <BellRing className="h-5 w-5 text-primary" />
                            실시간 알림
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>새로운 업무나 업데이트된 정보가 있을 때 즉시 알림을 통해 확인할 수 있습니다.</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            보안 유지
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>모든 자격 증명은 로컬에 안전하게 저장되며, 외부로 전송되지 않습니다.</p>
                    </CardContent>
                </Card>
            </div>

            <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">현재 상태</h2>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                            <div className="flex items-center gap-4">
                                {status.isRunning ? (
                                    <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle2 className="h-6 w-6" />
                                        <span className="font-medium">크롤링 활성화됨</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-amber-600">
                                        <AlertCircle className="h-6 w-6" />
                                        <span className="font-medium">크롤링 비활성화됨</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-6">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">마지막 크롤링</p>
                                        <p className="font-medium">{status.lastCrawl}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <RefreshCw className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">다음 크롤링</p>
                                        <p className="font-medium">{status.nextCrawl}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Bell className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">새 알림</p>
                                        <p className="font-medium">{status.newAlerts}개</p>
                                    </div>
                                </div>
                            </div>

                            <Button onClick={() => navigate("/notifications")}>알림 확인하기</Button>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">시작하기</h2>
                <Tabs defaultValue="step1" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="step1">1. 설정하기</TabsTrigger>
                        <TabsTrigger value="step2">2. 크롤링 시작</TabsTrigger>
                        <TabsTrigger value="step3">3. 알림 확인</TabsTrigger>
                    </TabsList>
                    <TabsContent value="step1" className="p-4 border rounded-md mt-2">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="flex-1">
                                <h3 className="text-lg font-medium mb-2">업무 사이트 자격 증명 설정</h3>
                                <p className="mb-4">
                                    설정 페이지에서 업무 사이트 URL, 아이디, 비밀번호를 입력하세요. 모든 정보는 로컬에 안전하게
                                    저장됩니다.
                                </p>
                                <Button variant="outline" onClick={() => navigate("/crawler-config")}>
                                    설정 페이지로 이동
                                </Button>
                            </div>
                            <div className="flex-1 bg-gray-100 rounded-md p-6 text-center">
                                <Settings className="h-16 w-16 mx-auto mb-4 text-primary" />
                                <p className="text-sm text-muted-foreground">설정 화면 예시</p>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="step2" className="p-4 border rounded-md mt-2">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="flex-1">
                                <h3 className="text-lg font-medium mb-2">크롤링 설정 및 시작</h3>
                                <p className="mb-4">
                                    크롤링 주기와 알림 설정을 조정한 후, 크롤링을 시작하세요. 자동으로 설정된 주기에 따라 업무 페이지를
                                    확인합니다.
                                </p>
                                <Button variant="outline" onClick={() => navigate("/crawler-config")}>
                                    크롤링 설정하기
                                </Button>
                            </div>
                            <div className="flex-1 bg-gray-100 rounded-md p-6 text-center">
                                <RefreshCw className="h-16 w-16 mx-auto mb-4 text-primary" />
                                <p className="text-sm text-muted-foreground">크롤링 진행 중</p>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="step3" className="p-4 border rounded-md mt-2">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="flex-1">
                                <h3 className="text-lg font-medium mb-2">알림 확인 및 관리</h3>
                                <p className="mb-4">
                                    새로운 업무나 업데이트가 있을 때 알림을 받고, 알림 페이지에서 모든 정보를 확인하세요.
                                </p>
                                <Button variant="outline" onClick={() => navigate("/notifications")}>
                                    알림 페이지로 이동
                                </Button>
                            </div>
                            <div className="flex-1 bg-gray-100 rounded-md p-6 text-center">
                                <Bell className="h-16 w-16 mx-auto mb-4 text-primary" />
                                <p className="text-sm text-muted-foreground">알림 화면 예시</p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </section>

            <section>
                <Card>
                    <CardHeader>
                        <CardTitle>도움이 필요하신가요?</CardTitle>
                        <CardDescription>문제가 있거나 추가 기능이 필요하시면 IT 부서에 문의하세요.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            담당자: 홍길동
                            <br />
                            이메일: support@company.com
                            <br />
                            내선번호: 1234
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full" onClick={handleFeedback}>
                            피드백 보내기
                        </Button>
                    </CardFooter>
                </Card>
            </section>
        </div>
    )
}
