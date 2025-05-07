import { useEffect, useState } from 'react';

import { Bell, Clock, ExternalLink, User } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useAppStore } from '@/store/app-store.ts';

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
    return 'bg-red-50 dark:bg-red-950/20';
  } else if (alert.isDelayed) {
    return 'bg-amber-50 dark:bg-amber-950/20';
  } else if (alert.isPending) {
    return 'bg-blue-50 dark:bg-blue-950/20';
  }

  return '';
}

// 알림 상태에 따른 제목 스타일 결정
function getTitleStyle(alert: AlertItem): string {
  if (alert.isUrgent) {
    return 'font-medium text-red-600 dark:text-red-400';
  } else if (alert.isDelayed) {
    return 'font-medium text-amber-600 dark:text-amber-400';
  } else if (alert.isPending) {
    return 'font-medium text-blue-600 dark:text-blue-400';
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
  const [personalRequests, setPersonalRequests] = useState<AlertItem[]>([]);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const { isMonitoring } = useAppStore();

  // 알림 목록 불러오기
  const loadAlerts = async () => {
    if (!isMonitoring) return;
    try {
      const result = await window.electron.invoke('get-alerts');

      if (result.success) {
        setAlerts(result.alerts || []);
        setPersonalRequests(result.personalRequests || []);
        setLastChecked(result.lastChecked || null);
      } else {
        console.error('알림 로드 실패:', result.error || result.message);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      toast.error('알림 로드 실패', {
        description: '알림 내역을 불러오는 중 오류가 발생했습니다.',
      });
    }
  };

  // 요청 상세 보기
  const viewRequest = (srIdx: string) => {
    window.electron.invoke('open-request', srIdx);
  };

  // 텍스트 자르기 함수
  function truncateText(text: string, maxLength: number): { isTruncated: boolean; displayText: string } {
    if (!text || text.length <= maxLength) {
      return { isTruncated: false, displayText: text || '' };
    }
    return { isTruncated: true, displayText: text.slice(0, maxLength) + '...' };
  }

  // 모니터링 상태 변경 시 알림 목록 로드
  useEffect(() => {
    // 새 알림 이벤트 리스너 등록
    const newAlertsListener = window.electron.on('new-alerts-available', () => {
      if (isMonitoring) loadAlerts();
    });

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      if (typeof newAlertsListener === 'function') newAlertsListener();
    };
  }, [isMonitoring]);

  // 모니터링 상태 변경 시 알림 목록 로드
  useEffect(() => {
    if (isMonitoring) loadAlerts();
  }, [isMonitoring]);

  // 테이블 렌더링 함수
  const renderTable = (items: AlertItem[]) => {
    return (
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
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                {isMonitoring ? '데이터가 없습니다' : '모니터링을 시작하면 데이터가 표시됩니다'}
              </TableCell>
            </TableRow>
          ) : (
            items.map((item, index) => {
              const companyName = truncateText(item.CM_NAME, 10);
              const title = truncateText(item.REQ_TITLE, 30);
              const rowStyle = getRowStyle(item);
              const titleStyle = getTitleStyle(item);
              const indicator = getIndicator(item);

              return (
                <TableRow key={item.SR_IDX} className={`hover:bg-muted/30 border-b ${rowStyle || (index % 2 === 1 ? 'bg-muted/10' : '')}`}>
                  <TableCell className="py-1 px-2 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{companyName.displayText}</span>
                        </TooltipTrigger>
                        {companyName.isTruncated && (
                          <TooltipContent>
                            <p className="text-xs">{item.CM_NAME}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="py-1 px-2 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`flex items-center ${titleStyle}`}>
                            {indicator}
                            {title.displayText}
                          </span>
                        </TooltipTrigger>
                        {title.isTruncated && (
                          <TooltipContent>
                            <p className="text-xs">{item.REQ_TITLE}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="py-1 px-2">
                    <Badge variant={getStatusVariant(item.STATUS)} className="text-[10px] px-1 py-0 h-5">
                      {item.STATUS}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-1 px-2 text-xs">{item.WRITER}</TableCell>
                  <TableCell className="py-1 px-2 text-xs text-muted-foreground">{item.REQ_DATE_ALL}</TableCell>
                  <TableCell className="py-1 px-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => viewRequest(item.SR_IDX)}>
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
            })
          )}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="container">
      {isMonitoring && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {lastChecked ? `마지막 확인: ${lastChecked}` : '알림을 확인하는 중입니다...'}
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
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            전체 알림
            <Badge variant="secondary" className="ml-1">
              {alerts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />내 처리 건
            <Badge variant="secondary" className="ml-1">
              {personalRequests.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>전체 알림 내역</CardTitle>
                  <CardDescription>모든 접수 건을 우선순위에 따라 표시합니다</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(80vh-300px)]">{renderTable(alerts)}</ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>내 처리 건</CardTitle>
                  <CardDescription>현재 사용자가 처리 중인 접수 건을 표시합니다</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(80vh-300px)]">{renderTable(personalRequests)}</ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
