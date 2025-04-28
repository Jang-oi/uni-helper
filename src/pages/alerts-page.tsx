'use client';

import { useEffect, useState } from 'react';

import { Bell, CheckCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useAppStore } from '@/store/app-store';

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

// 페이지네이션 정보 인터페이스
interface PaginationInfo {
  page: number;
  pageSize: number;
  totalAlerts: number;
  totalPages: number;
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
  const { isMonitoring } = useAppStore();

  // 페이지네이션 상태
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    totalAlerts: 0,
    totalPages: 0,
  });

  // 알림 목록 불러오기
  const loadAlerts = async (page = pagination.page, pageSize = pagination.pageSize) => {
    if (!isMonitoring) {
      return; // 모니터링 중이 아니면 알림을 로드하지 않음
    }

    setIsLoading(true);
    try {
      if (!window.electron) {
        console.error('Electron API not available');
        return;
      }

      // 페이지네이션을 지원하는 새 IPC 메서드 호출
      const result = await window.electron.invoke('get-alerts-paginated', {
        page,
        pageSize,
        filter: activeTab === 'unread' ? 'unread' : 'all', // 필터 정보도 함께 전달
      });

      if (result.success) {
        setAlerts(result.alerts || []);
        setLastChecked(result.lastChecked || null);
        setPagination(result.pagination);
      } else {
        toast.error('알림 로드 실패', {
          description: result.error || '알림을 불러오는 중 오류가 발생했습니다.',
        });
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      toast.error('알림 로드 실패', {
        description: '알림 내역을 불러오는 중 오류가 발생했습니다.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    loadAlerts(newPage, pagination.pageSize);
  };

  // 페이지 크기 변경 핸들러
  const handlePageSizeChange = (newSize: string) => {
    const size = Number.parseInt(newSize, 10);
    loadAlerts(1, size); // 페이지 크기가 변경되면 첫 페이지로 이동
  };

  // 탭 변경 시 알림 다시 로드
  useEffect(() => {
    if (isMonitoring) {
      loadAlerts(1, pagination.pageSize); // 탭이 변경되면 첫 페이지로 이동
    }
  }, [activeTab, isMonitoring]);

  // 모니터링 상태 변경 시 알림 목록 로드
  useEffect(() => {
    if (isMonitoring) {
      loadAlerts();
    }
  }, [isMonitoring]);

  // 이벤트 리스너 등록
  useEffect(() => {
    if (!window.electron) {
      console.error('Electron API not available');
      return;
    }

    // 알림 읽음 처리 이벤트 리스너 등록
    const removeAlertMarkedAsReadListener = window.electron.on('alert-marked-as-read', (srIdx: string) => {
      console.log(`알림 읽음 처리 이벤트 수신: ${srIdx}`);
      setAlerts((prev) => prev.map((alert) => (alert.SR_IDX === srIdx ? { ...alert, isNew: false, isRead: true } : alert)));
    });

    // 새 알림 이벤트 리스너 등록 - 모니터링 중일 때만 자동 업데이트
    const newAlertsListener = window.electron.on('new-alerts-available', () => {
      if (isMonitoring) {
        loadAlerts(); // 현재 페이지 유지하면서 새로고침
        toast.info('새로운 알림이 있습니다', {
          description: '알림 목록이 자동으로 업데이트되었습니다.',
        });
      }
    });

    // 모니터링 상태 변경 이벤트 리스너
    const monitoringStatusListener = window.electron.on('monitoring-status-changed', (status: boolean) => {
      if (status) {
        loadAlerts();
      }
    });

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      if (typeof removeAlertMarkedAsReadListener === 'function') {
        removeAlertMarkedAsReadListener();
      }
      if (typeof newAlertsListener === 'function') {
        newAlertsListener();
      }
      if (typeof monitoringStatusListener === 'function') {
        monitoringStatusListener();
      }
    };
  }, [isMonitoring, pagination.page, pagination.pageSize, activeTab]);

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

      // 현재 페이지 알림 상태 업데이트
      setAlerts((prev) => prev.map((alert) => ({ ...alert, isNew: false, isRead: true })));

      // 알림 목록 새로고침 (읽지 않음 탭인 경우 특히 중요)
      if (activeTab === 'unread') {
        loadAlerts();
      }

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

  // 읽지 않은 알림 개수 (페이지네이션 정보에서 가져옴)
  const unreadCount = activeTab === 'unread' ? pagination.totalAlerts : pagination.totalAlerts > 0 ? pagination.totalAlerts : 0;

  // 현재 표시 중인 알림 범위 계산
  const startItem = pagination.totalAlerts === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalAlerts);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              알림 내역
              {unreadCount > 0 && activeTab !== 'unread' && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isMonitoring ? (
                lastChecked ? (
                  <span>마지막 확인: {lastChecked} (실시간 업데이트 활성화됨)</span>
                ) : (
                  '알림을 확인하는 중입니다...'
                )
              ) : (
                '모니터링이 시작되면 알림이 자동으로 업데이트됩니다.'
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {pagination.totalAlerts > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={!isMonitoring}>
                <CheckCircle className="h-4 w-4 mr-1" />
                모두 읽음 표시
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isMonitoring ? (
            <Alert className="mb-4">
              <AlertTitle>모니터링이 비활성화되어 있습니다</AlertTitle>
              <AlertDescription>알림을 확인하려면 설정 페이지에서 모니터링을 시작하세요.</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="all">전체 ({pagination.totalAlerts})</TabsTrigger>
                    <TabsTrigger value="unread">읽지 않음 ({unreadCount})</TabsTrigger>
                  </TabsList>
                </Tabs>

                {pagination.totalAlerts > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">페이지당 항목:</span>
                    <Select value={pagination.pageSize.toString()} onValueChange={handlePageSizeChange}>
                      <SelectTrigger className="w-[70px]">
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {activeTab === 'unread' ? '읽지 않은 알림이 없습니다' : '알림 내역이 없습니다'}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {alerts.map((alert) => (
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
            </>
          )}
        </CardContent>
        {pagination.totalAlerts > 0 && (
          <CardFooter className="flex justify-between items-center border-t pt-4">
            <div className="text-sm text-muted-foreground">
              {startItem}-{endItem} / 총 {pagination.totalAlerts}개
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => handlePageChange(1)} disabled={pagination.page === 1 || isLoading}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="mx-2 text-sm">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages || isLoading}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
