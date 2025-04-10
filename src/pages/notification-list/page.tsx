"use client"

import { useState, useEffect } from "react"
import { Check, CheckCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface Notification {
    id: string
    title: string
    message: string
    timestamp: string
    read: boolean
    isNew: boolean
    isUpdated: boolean
}

export default function NotificationListPage() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchNotifications()
    }, [])

    const fetchNotifications = async () => {
        setIsLoading(true)
        try {
            // This would be your actual API call to get notifications from the main process
            await new Promise((resolve) => setTimeout(resolve, 1000))

            // Sample data
            const sampleNotifications: Notification[] = [
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
            ]

            setNotifications(sampleNotifications)
        } catch (error) {
            toast.error("알림 로드 실패", {
                description: "알림을 불러오는 중 오류가 발생했습니다.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
        )
    }

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
        toast.success("모든 알림 읽음 처리", {
            description: "모든 알림이 읽음 처리되었습니다.",
        })
    }

    const getStatusBadge = (notification: Notification) => {
        if (notification.isNew) {
            return (
                <Badge variant="default" className="bg-green-500">
                    새 항목
                </Badge>
            )
        }
        if (notification.isUpdated) {
            return (
                <Badge variant="default" className="bg-blue-500">
                    업데이트
                </Badge>
            )
        }
        return null
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">알림</h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchNotifications} disabled={isLoading}>
                        <Check className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                        새로고침
                    </Button>
                    <Button variant="outline" size="sm" onClick={markAllAsRead}>
                        <CheckCheck className="h-4 w-4 mr-2" />
                        모두 읽음
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="all">
                <TabsList className="mb-4">
                    <TabsTrigger value="all">전체</TabsTrigger>
                    <TabsTrigger value="unread">읽지 않음</TabsTrigger>
                    <TabsTrigger value="new">새 항목</TabsTrigger>
                    <TabsTrigger value="updated">업데이트</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <p>알림을 불러오는 중...</p>
                        </div>
                    ) : notifications.length > 0 ? (
                        notifications.map((notification) => (
                            <Card
                                key={notification.id}
                                className={`cursor-pointer transition-opacity ${notification.read ? "opacity-70" : ""}`}
                                onClick={() => markAsRead(notification.id)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-base">{notification.title}</CardTitle>
                                            {getStatusBadge(notification)}
                                        </div>
                                        <CardDescription>{notification.timestamp}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p>{notification.message}</p>
                                    {!notification.read && (
                                        <div className="flex justify-end mt-2">
                                            <Button variant="ghost" size="sm" className="h-8" onClick={(e) => {
                                                e.stopPropagation();
                                                markAsRead(notification.id);
                                            }}>
                                                <Check className="h-4 w-4 mr-2" />
                                                읽음 표시
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="flex justify-center py-8">
                            <p>알림이 없습니다.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="unread" className="space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <p>알림을 불러오는 중...</p>
                        </div>
                    ) : notifications.filter((n) => !n.read).length > 0 ? (
                        notifications
                            .filter((notification) => !notification.read)
                            .map((notification) => (
                                <Card key={notification.id} className="cursor-pointer" onClick={() => markAsRead(notification.id)}>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-base">{notification.title}</CardTitle>
                                                {getStatusBadge(notification)}
                                            </div>
                                            <CardDescription>{notification.timestamp}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p>{notification.message}</p>
                                        <div className="flex justify-end mt-2">
                                            <Button variant="ghost" size="sm" className="h-8" onClick={(e) => {
                                                e.stopPropagation();
                                                markAsRead(notification.id);
                                            }}>
                                                <Check className="h-4 w-4 mr-2" />
                                                읽음 표시
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                    ) : (
                        <div className="flex justify-center py-8">
                            <p>읽지 않은 알림이 없습니다.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="new" className="space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <p>알림을 불러오는 중...</p>
                        </div>
                    ) : notifications.filter((n) => n.isNew).length > 0 ? (
                        notifications
                            .filter((notification) => notification.isNew)
                            .map((notification) => (
                                <Card
                                    key={notification.id}
                                    className={`cursor-pointer transition-opacity ${notification.read ? "opacity-70" : ""}`}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-base">{notification.title}</CardTitle>
                                                <Badge variant="default" className="bg-green-500">
                                                    새 항목
                                                </Badge>
                                            </div>
                                            <CardDescription>{notification.timestamp}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p>{notification.message}</p>
                                        {!notification.read && (
                                            <div className="flex justify-end mt-2">
                                                <Button variant="ghost" size="sm" className="h-8" onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notification.id);
                                                }}>
                                                    <Check className="h-4 w-4 mr-2" />
                                                    읽음 표시
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                    ) : (
                        <div className="flex justify-center py-8">
                            <p>새 항목이 없습니다.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="updated" className="space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <p>알림을 불러오는 중...</p>
                        </div>
                    ) : notifications.filter((n) => n.isUpdated).length > 0 ? (
                        notifications
                            .filter((notification) => notification.isUpdated)
                            .map((notification) => (
                                <Card
                                    key={notification.id}
                                    className={`cursor-pointer transition-opacity ${notification.read ? "opacity-70" : ""}`}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-base">{notification.title}</CardTitle>
                                                <Badge variant="default" className="bg-blue-500">
                                                    업데이트
                                                </Badge>
                                            </div>
                                            <CardDescription>{notification.timestamp}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p>{notification.message}</p>
                                        {!notification.read && (
                                            <div className="flex justify-end mt-2">
                                                <Button variant="ghost" size="sm" className="h-8" onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notification.id);
                                                }}>
                                                    <Check className="h-4 w-4 mr-2" />
                                                    읽음 표시
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                    ) : (
                        <div className="flex justify-center py-8">
                            <p>업데이트된 항목이 없습니다.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
