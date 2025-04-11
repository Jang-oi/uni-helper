import { useEffect, useState } from 'react';

import { Bell, CheckCircle, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// 알림 아이템 인터페이스
interface AlertItem {
  SR_IDX: string;
  REQ_TITLE: string;
  CM_NAME: string;
  STATUS: string;
  WRITER: string;
  REQ_DATE: string;
  REQ_DATE_ALL: string;
  isNew: boolean;
  isRead?: boolean;
}

// 상태에 따른 배지 스타일 결정
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const statusLower = status.toLowerCase();

  if (statusLower.includes('접수') || statusLower.includes('신규')) {
    return 'default';
  } else if (statusLower.includes('진행') || statusLower.includes('처리')) {
    return 'secondary';
  } else if (statusLower.includes('지연') || statusLower.includes('보류')) {
    return 'destructive';
  } else {
    return 'outline';
  }
}

export function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // 알림 목록 불러오기
  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      if (!window.electron) {
        console.error('Electron API not available');
        return;
      }

      const result = await window.electron.invoke('get-alerts');
      setAlerts(result.alerts || []);
      setLastChecked(result.lastChecked || null);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      toast.error('알림 로드 실패', {
        description: '알림 내역을 불러오는 중 오류가 발생했습니다.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    loadAlerts();

    if (!window.electron) {
      console.error('Electron API not available');
      return;
    }

    // 알림 읽음 처리 이벤트 리스너 등록
    const removeAlertMarkedAsReadListener = window.electron.on('alert-marked-as-read', (srIdx: string) => {
      console.log(`알림 읽음 처리 이벤트 수신: ${srIdx}`);
      setAlerts((prev) => prev.map((alert) => (alert.SR_IDX === srIdx ? { ...alert, isNew: false, isRead: true } : alert)));
    });

    return () => {
      removeAlertMarkedAsReadListener();
    };
  }, []);

  // 알림 읽음 표시
  const markAsRead = async (srIdx: string) => {
    try {
      if (!window.electron) {
        toast.error('Electron API not available');
        return;
      }

      await window.electron.invoke('mark-alert-as-read', srIdx);

      // 로컬 상태 업데이트
      setAlerts((prev) => prev.map((alert) => (alert.SR_IDX === srIdx ? { ...alert, isNew: false, isRead: true } : alert)));
    } catch (error) {
      toast.error('알림 상태 변경 실패');
    }
  };

  // 모든 알림 읽음 표시
  const markAllAsRead = async () => {
    try {
      if (!window.electron) {
        toast.error('Electron API not available');
        return;
      }

      await window.electron.invoke('mark-all-alerts-as-read');

      // 로컬 상태 업데이트
      setAlerts((prev) => prev.map((alert) => ({ ...alert, isNew: false, isRead: true })));

      toast.success('모든 알림을 읽음으로 표시했습니다');
    } catch (error) {
      toast.error('알림 상태 변경 실패');
    }
  };

  // 요청 상세 보기
  const viewRequest = (srIdx: string) => {
    if (!window.electron) {
      toast.error('Electron API not available');
      return;
    }

    window.electron.invoke('open-request', srIdx);

    // 읽음 표시도 함께 처리
    markAsRead(srIdx);
  };

  // 필터링된 알림 목록
  const filteredAlerts = alerts.filter((alert) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return alert.isNew && !alert.isRead;
    return false;
  });

  // 읽지 않은 알림 개수
  const unreadCount = alerts.filter((alert) => alert.isNew && !alert.isRead).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              알림 내역
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{lastChecked ? `마지막 확인: ${lastChecked}` : '아직 확인된 내역이 없습니다'}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadAlerts} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCircle className="h-4 w-4 mr-1" />
                모두 읽음 표시
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">전체 ({alerts.length})</TabsTrigger>
              <TabsTrigger value="unread">읽지 않음 ({unreadCount})</TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {activeTab === 'unread' ? '읽지 않은 알림이 없습니다' : '알림 내역이 없습니다'}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <div
                    key={alert.SR_IDX}
                    className={`p-4 border rounded-lg transition-colors ${
                      alert.isNew && !alert.isRead ? 'bg-muted border-primary/20' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium flex items-center gap-2">
                        {alert.isNew && !alert.isRead && <span className="w-2 h-2 bg-primary rounded-full" aria-hidden="true" />}
                        <span>
                          {alert.CM_NAME} - {alert.REQ_TITLE}
                        </span>
                      </h3>
                      <Badge variant={getStatusVariant(alert.STATUS)}>{alert.STATUS}</Badge>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mb-3">
                      <Clock className="h-3 w-3 mr-1" />
                      {alert.REQ_DATE_ALL}
                      <span className="mx-2">•</span>
                      <span>{alert.WRITER}</span>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      {alert.isNew && !alert.isRead && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => markAsRead(alert.SR_IDX)}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                읽음
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>읽음으로 표시</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => viewRequest(alert.SR_IDX)}>
                              <ExternalLink className="h-4 w-4 mr-1" />
                              접수건 보기
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>업무 사이트에서 접수건 상세 보기</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
