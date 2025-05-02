import { useEffect, useState } from 'react';

import { Bell, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  PROCESS_DATE: string;
  // 추가된 상태 플래그
  isUrgent: boolean;
  isDelayed: boolean;
  isPending: boolean;
}

// 상태에 따른 배지 스타일 결정
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const statusLower = status.toLowerCase();

  if (statusLower.includes('처리')) {
    return 'default';
  } else if (statusLower.includes('요청')) {
    return 'secondary';
  } else if (statusLower.includes('고객사')) {
    return 'destructive';
  } else {
    return 'outline';
  }
}

// 알림 상태에 따른 행 스타일 결정
function getRowStyle(alert: AlertItem): string {
  if (alert.isUrgent) {
    return 'bg-red-50 dark:bg-red-950/20 animate-pulse';
  } else if (alert.isDelayed) {
    return 'bg-amber-50 dark:bg-amber-950/20 animate-pulse';
  } else if (alert.isPending) {
    return 'bg-blue-50 dark:bg-blue-950/20 animate-pulse';
  }

  return '';
}

// 알림 상태에 따른 제목 스타일 결정
function getTitleStyle(alert: AlertItem): string {
  if (alert.isUrgent) {
    return 'font-bold text-red-600 dark:text-red-400 flex items-center gap-1';
  } else if (alert.isDelayed) {
    return 'font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1';
  } else if (alert.isPending) {
    return 'font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1';
  }

  return '';
}

// 알림 상태에 따른 인디케이터 표시
function getIndicator(alert: AlertItem) {
  if (alert.isUrgent) {
    return <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-ping mr-1" />;
  } else if (alert.isDelayed) {
    return <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-ping mr-1" />;
  } else if (alert.isPending) {
    return <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 animate-ping mr-1" />;
  }

  return null;
}

export function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const { isMonitoring } = useAppStore();

  // 알림 목록 불러오기
  const loadAlerts = async () => {
    if (!isMonitoring) return; // 모니터링 중이 아니면 알림을 로드하지 않음
    try {
      // 페이지네이션을 지원하는 새 IPC 메서드 호출
      const result = await window.electron.invoke('get-alerts');

      if (result.success) {
        setAlerts(result.alerts || []);
        setLastChecked(result.lastChecked || null);
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
    }
  };

  // 텍스트 자르기 함수
  function truncateText(text: string, maxLength: number): { isTruncated: boolean; displayText: string } {
    if (text.length <= maxLength) {
      return { isTruncated: false, displayText: text };
    }
    return { isTruncated: true, displayText: text.slice(0, maxLength) + '...' };
  }

  // 모니터링 상태 변경 시 알림 목록 로드
  useEffect(() => {
    if (isMonitoring) loadAlerts();
  }, [isMonitoring]);

  // 이벤트 리스너 등록
  useEffect(() => {
    // 새 알림 이벤트 리스너 등록 - 모니터링 중일 때만 자동 업데이트
    const newAlertsListener = window.electron.on('new-alerts-available', () => {
      if (isMonitoring) loadAlerts(); // 새로고침
    });

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      if (typeof newAlertsListener === 'function') newAlertsListener();
    };
  }, [isMonitoring]);

  // 요청 상세 보기
  const viewRequest = (srIdx: string) => {
    window.electron.invoke('open-request', srIdx);
  };

  return (
    <Card className="max-w-5xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 내역
          </CardTitle>
          <CardDescription>
            {isMonitoring ? (
              lastChecked ? (
                <span>마지막 확인: {lastChecked}</span>
              ) : (
                '알림을 확인하는 중입니다...'
              )
            ) : (
              '모니터링이 시작되면 알림이 자동으로 업데이트됩니다.'
            )}
          </CardDescription>
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
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">정렬 기준:</span>
                  <Badge variant="secondary" className="bg-primary/10">
                    고객사답변 → 처리중 → 긴급요청 → 처리지연 → 접수후 1시간 이상 미처리 → 최신순
                  </Badge>
                </div>
                <Badge variant="secondary" className="text-xs font-medium">
                  총 {alerts.length}개의 알림
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground">알림 표시:</span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-red-600 dark:text-red-400">긴급 요청 (제목에 "긴급" 포함)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-amber-600 dark:text-amber-400">처리 지연 (1주일 이상 소요)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                  <span className="text-blue-600 dark:text-blue-400">접수 후 1시간 이상 미처리</span>
                </div>
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">{'알림 내역이 없습니다'}</div>
            ) : (
              <div className="w-full">
                <ScrollArea className="h-[510px]">
                  <Table className="border-collapse w-full table-fixed">
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow className="border-b border-t hover:bg-transparent">
                        <TableHead className="h-8 text-xs font-medium py-1 px-2 w-[15%]">고객사</TableHead>
                        <TableHead className="h-8 text-xs font-medium py-1 px-2 w-[40%]">제목</TableHead>
                        <TableHead className="h-8 text-xs font-medium py-1 px-2 w-[10%]">상태</TableHead>
                        <TableHead className="h-8 text-xs font-medium py-1 px-2 w-[10%]">처리자</TableHead>
                        <TableHead className="h-8 text-xs font-medium py-1 px-2 w-[20%]">요청일시</TableHead>
                        <TableHead className="h-8 text-xs font-medium py-1 px-2 w-[5%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map((alert, index) => {
                        const companyName = truncateText(alert.CM_NAME, 10);
                        const title = truncateText(alert.REQ_TITLE, 30);
                        const rowStyle = getRowStyle(alert);
                        const titleStyle = getTitleStyle(alert);
                        const indicator = getIndicator(alert);

                        return (
                          <TableRow
                            key={alert.SR_IDX}
                            className={`hover:bg-muted/30 border-b ${rowStyle || (index % 2 === 1 ? 'bg-muted/10' : '')}`}
                          >
                            <TableCell className="py-1 px-2 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>{companyName.displayText}</span>
                                  </TooltipTrigger>
                                  {companyName.isTruncated && (
                                    <TooltipContent side="bottom" className="max-w-sm">
                                      <p className="text-sm">{alert.CM_NAME}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="py-1 px-2 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className={`${titleStyle}`}>
                                      {indicator}
                                      {title.displayText}
                                    </span>
                                  </TooltipTrigger>
                                  {title.isTruncated && (
                                    <TooltipContent side="bottom" className="max-w-sm">
                                      <p className="text-sm">{alert.REQ_TITLE}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="py-1 px-2">
                              <Badge variant={getStatusVariant(alert.STATUS)} className="text-[10px] px-1 py-0 h-5">
                                {alert.STATUS}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-1 px-2 text-xs">{alert.WRITER}</TableCell>
                            <TableCell className="py-1 px-2 text-xs text-muted-foreground">{alert.REQ_DATE_ALL}</TableCell>
                            <TableCell className="py-1 px-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => viewRequest(alert.SR_IDX)}>
                                      <ExternalLink className="h-3 w-3" />
                                      <span className="sr-only">접수건 보기</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">업무 사이트에서 접수건 상세 보기</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
