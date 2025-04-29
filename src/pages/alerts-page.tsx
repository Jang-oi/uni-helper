import { useEffect, useState } from 'react';

import { Bell, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  COMPLETE_DATE_ALL: string;
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

  if (statusLower.includes('접수')) {
    return 'default';
  } else if (statusLower.includes('요청')) {
    return 'secondary';
  } else if (statusLower.includes('처리') || statusLower.includes('고객사')) {
    return 'destructive';
  } else {
    return 'outline';
  }
}

export function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
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
    if (!isMonitoring) return; // 모니터링 중이 아니면 알림을 로드하지 않음
    setIsLoading(true);
    try {
      if (!window.electron) {
        console.error('Electron API not available');
        return;
      }

      // 페이지네이션을 지원하는 새 IPC 메서드 호출
      const result = await window.electron.invoke('get-alerts-paginated', { page, pageSize });

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

  // 텍스트 자르기 함수
  function truncateText(text: string, maxLength: number): { isTruncated: boolean; displayText: string } {
    if (text.length <= maxLength) {
      return { isTruncated: false, displayText: text };
    }
    return { isTruncated: true, displayText: text.slice(0, maxLength) + '...' };
  }

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    loadAlerts(newPage, pagination.pageSize);
  };

  // 페이지 크기 변경 핸들러
  const handlePageSizeChange = (newSize: string) => {
    const size = Number.parseInt(newSize, 10);
    setPagination((prev) => ({
      ...prev,
      pageSize: size,
      page: 1,
    }));
    loadAlerts(1, size); // 페이지 크기가 변경되면 첫 페이지로 이동
  };

  // 모니터링 상태 변경 시 알림 목록 로드
  useEffect(() => {
    if (isMonitoring) loadAlerts();
  }, [isMonitoring]);

  // 이벤트 리스너 등록
  useEffect(() => {
    if (!window.electron) {
      console.error('Electron API not available');
      return;
    }

    // 새 알림 이벤트 리스너 등록 - 모니터링 중일 때만 자동 업데이트
    const newAlertsListener = window.electron.on('new-alerts-available', () => {
      console.log('새 알림 이벤트 수신됨');
      if (isMonitoring) loadAlerts(pagination.page, pagination.pageSize); // 현재 페이지 유지하면서 새로고침
    });

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      if (typeof newAlertsListener === 'function') newAlertsListener();
    };
  }, [isMonitoring, pagination.page, pagination.pageSize]);

  // 요청 상세 보기
  const viewRequest = (srIdx: string) => {
    if (!window.electron) {
      toast.error('Electron API not available');
      return;
    }

    window.electron.invoke('open-request', srIdx);
  };

  // 현재 표시 중인 알림 범위 계산
  const startItem = pagination.totalAlerts === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalAlerts);

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
            <div className="flex justify-between items-center mb-4">
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
                      <SelectItem value="30">30</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">{'알림 내역이 없습니다'}</div>
            ) : (
              <div className="w-full">
                <ScrollArea className="h-[360px]">
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
                        const title = truncateText(alert.REQ_TITLE, 40);

                        return (
                          <TableRow key={alert.SR_IDX} className={`hover:bg-muted/30 border-b ${index % 2 === 1 ? 'bg-muted/10' : ''}`}>
                            <TableCell className="py-1 px-2 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className={companyName.isTruncated ? 'cursor-help' : ''}>{companyName.displayText}</span>
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
                                    <span className={title.isTruncated ? 'cursor-help' : ''}>{title.displayText}</span>
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
      {pagination.totalAlerts > 0 && (
        <CardFooter className="flex justify-between items-center border-t py-2 px-4">
          <div className="text-xs text-muted-foreground">
            {startItem}-{endItem} / 총 {pagination.totalAlerts}개
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => handlePageChange(1)}
              disabled={pagination.page === 1 || isLoading}
            >
              <ChevronsLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1 || isLoading}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="mx-1 text-xs">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages || isLoading}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages || isLoading}
            >
              <ChevronsRight className="h-3 w-3" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
