import { useCallback, useEffect, useRef, useState } from 'react';

import { Bell, Clock, ExternalLink, SortAsc, User } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

// 정렬 옵션 타입
type SortOption = 'default' | 'customerResponse' | 'inProgress' | 'urgent' | 'delayed' | 'pending' | 'dateAsc' | 'dateDesc';

// 정렬 옵션 레이블
const sortOptionLabels: Record<SortOption, string> = {
  default: '기본 정렬',
  customerResponse: '고객사답변 우선',
  inProgress: '처리중 우선',
  urgent: '긴급 요청 우선',
  delayed: '처리 지연 우선',
  pending: '접수 후 1시간 미처리 우선',
  dateAsc: '요청일시 (오래된순)',
  dateDesc: '요청일시 (최신순)',
};

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
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [personalSortOption, setPersonalSortOption] = useState<SortOption>('default');
  const { isMonitoring } = useAppStore();

  const [activeTab, setActiveTab] = useState('all');
  // 탭 참조 생성
  const tabsRef = useRef<HTMLDivElement>(null);

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

  // 알림 정렬 함수
  const sortAlerts = (items: AlertItem[], option: SortOption): AlertItem[] => {
    if (!items || items.length === 0) return [];

    const sortedItems = [...items];

    switch (option) {
      case 'customerResponse':
        return sortedItems.sort((a, b) => {
          // 고객사답변 우선
          if (a.STATUS === '고객사답변' && b.STATUS !== '고객사답변') return -1;
          if (a.STATUS !== '고객사답변' && b.STATUS === '고객사답변') return 1;
          // 그 다음은 날짜순
          return new Date(b.REQ_DATE_ALL).getTime() - new Date(a.REQ_DATE_ALL).getTime();
        });

      case 'inProgress':
        return sortedItems.sort((a, b) => {
          // 처리중 우선
          if (a.STATUS === '처리중' && b.STATUS !== '처리중') return -1;
          if (a.STATUS !== '처리중' && b.STATUS === '처리중') return 1;
          // 그 다음은 날짜순
          return new Date(b.REQ_DATE_ALL).getTime() - new Date(a.REQ_DATE_ALL).getTime();
        });

      case 'urgent':
        return sortedItems.sort((a, b) => {
          // 긴급 요청 우선
          if (a.isUrgent && !b.isUrgent) return -1;
          if (!a.isUrgent && b.isUrgent) return 1;
          // 그 다음은 날짜순
          return new Date(b.REQ_DATE_ALL).getTime() - new Date(a.REQ_DATE_ALL).getTime();
        });

      case 'delayed':
        return sortedItems.sort((a, b) => {
          // 처리 지연 우선
          if (a.isDelayed && !b.isDelayed) return -1;
          if (!a.isDelayed && b.isDelayed) return 1;
          // 그 다음은 날짜순
          return new Date(b.REQ_DATE_ALL).getTime() - new Date(a.REQ_DATE_ALL).getTime();
        });

      case 'pending':
        return sortedItems.sort((a, b) => {
          // 접수 후 1시간 미처리 우선
          if (a.isPending && !b.isPending) return -1;
          if (!a.isPending && b.isPending) return 1;
          // 그 다음은 날짜순
          return new Date(b.REQ_DATE_ALL).getTime() - new Date(a.REQ_DATE_ALL).getTime();
        });

      case 'dateAsc':
        return sortedItems.sort((a, b) => new Date(a.REQ_DATE_ALL).getTime() - new Date(b.REQ_DATE_ALL).getTime());

      case 'dateDesc':
        return sortedItems.sort((a, b) => new Date(b.REQ_DATE_ALL).getTime() - new Date(a.REQ_DATE_ALL).getTime());

      case 'default':
      default:
        // 기본 정렬: 서버에서 받은 순서 (이미 우선순위가 적용되어 있음)
        return sortedItems;
    }
  };

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

  // 탭 변경 함수 - 튜토리얼에서 사용
  const changeTab = useCallback((tabValue: string) => {
    setActiveTab(tabValue);
  }, []);

  // 튜토리얼에서 탭 변경을 위한 전역 함수 등록
  useEffect(() => {
    // @ts-ignore - 전역 객체에 함수 추가
    window.__changeSettingsTab = changeTab;

    return () => {
      // @ts-ignore - 컴포넌트 언마운트 시 제거
      delete window.__changeSettingsTab;
    };
  }, [changeTab]);

  // 정렬된 알림 목록 가져오기
  const getSortedAlerts = () => sortAlerts(alerts, sortOption);
  const getSortedPersonalRequests = () => sortAlerts(personalRequests, personalSortOption);

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
                    <Badge variant={getStatusVariant(item.STATUS)} className="text-[10px] px-1 py-0 h-5 w-14">
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

  // 정렬 드롭다운 메뉴 렌더링 함수
  const renderSortDropdown = (currentOption: SortOption, setOption: (option: SortOption) => void) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1 h-8">
            <SortAsc className="h-3.5 w-3.5" />
            <span className="text-xs">{sortOptionLabels[currentOption]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>정렬 기준</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={currentOption} onValueChange={(value) => setOption(value as SortOption)}>
            <DropdownMenuRadioItem value="default">기본 정렬</DropdownMenuRadioItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">상태별 정렬</DropdownMenuLabel>
            <DropdownMenuRadioItem value="customerResponse">고객사답변 우선</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="inProgress">처리중 우선</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="urgent">긴급 요청 우선</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="delayed">처리 지연 우선</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="pending">접수 후 1시간 미처리 우선</DropdownMenuRadioItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">날짜별 정렬</DropdownMenuLabel>
            <DropdownMenuRadioItem value="dateDesc">요청일시 (최신순)</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dateAsc">요청일시 (오래된순)</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-tutorial="alerts-page">
      {isMonitoring && (
        <div className="bg-muted/30 p-4 rounded-lg mb-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">알림 상태</h3>
              <p className="text-sm text-muted-foreground">{lastChecked ? `마지막 확인: ${lastChecked}` : '알림을 확인하는 중입니다...'}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
              <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-sm text-red-600 dark:text-red-400">긴급 요청</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
              <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              <span className="text-sm text-amber-600 dark:text-amber-400">처리 지연</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
              <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
              <span className="text-sm text-blue-600 dark:text-blue-400">1시간 미처리</span>
            </div>
          </div>
        </div>
      )}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" data-tutorial="alerts-tabs" ref={tabsRef}>
        <TabsList className="grid w-full grid-cols-2 mb-1">
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
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>전체 알림 내역</CardTitle>
                  <CardDescription>모든 접수 건을 우선순위에 따라 표시합니다</CardDescription>
                </div>
                {renderSortDropdown(sortOption, setSortOption)}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(84vh-300px)]">{renderTable(getSortedAlerts())}</ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>내 처리 건</CardTitle>
                  <CardDescription>현재 사용자가 처리 중인 접수 건을 표시합니다</CardDescription>
                </div>
                {renderSortDropdown(personalSortOption, setPersonalSortOption)}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(84vh-300px)]">{renderTable(getSortedPersonalRequests())}</ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
