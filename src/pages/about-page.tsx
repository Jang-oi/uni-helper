import { useState } from 'react';

import { Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// 버전 정보
const APP_VERSION = '1.0.0';

// 가상의 업데이트 정보 (10건 이상)
const UPDATES = [
  {
    version: '1.0.0',
    date: '2025-04-10',
    notes: ['최초 버전 출시', '업무 사이트 모니터링 기능', '알림 기능'],
    current: true,
  },
  {
    version: '0.9.5',
    date: '2025-04-01',
    notes: ['RC 버전', 'UI 개선', '성능 최적화', '버그 수정'],
    current: false,
  },
  {
    version: '0.9.0',
    date: '2025-03-15',
    notes: ['베타 테스트 버전', '기본 UI 구현', '설정 저장 기능 추가'],
    current: false,
  },
  {
    version: '0.8.5',
    date: '2025-03-01',
    notes: ['알림 시스템 개선', '로그인 프로세스 안정화', '메모리 사용량 최적화'],
    current: false,
  },
  {
    version: '0.8.0',
    date: '2025-02-15',
    notes: ['알림 시스템 구현', '업무 사이트 연동 기능 추가', '자동 업데이트 기능 추가'],
    current: false,
  },
  {
    version: '0.7.5',
    date: '2025-02-01',
    notes: ['설정 페이지 개선', '다크 모드 지원', '키보드 단축키 추가'],
    current: false,
  },
  {
    version: '0.7.0',
    date: '2025-01-15',
    notes: ['설정 페이지 구현', '테마 시스템 추가', '로깅 시스템 개선'],
    current: false,
  },
  {
    version: '0.6.5',
    date: '2025-01-01',
    notes: ['성능 최적화', '메모리 누수 수정', '시작 시간 개선'],
    current: false,
  },
  {
    version: '0.6.0',
    date: '2024-12-15',
    notes: ['기본 UI 프레임워크 구현', '라우팅 시스템 추가', '상태 관리 시스템 구현'],
    current: false,
  },
  {
    version: '0.5.0',
    date: '2024-12-01',
    notes: ['프로젝트 초기 구조 설정', 'Electron 설정', 'React 통합'],
    current: false,
  },
  {
    version: '0.4.0',
    date: '2024-11-15',
    notes: ['개념 증명 버전', '기본 기능 테스트', '아키텍처 설계'],
    current: false,
  },
  {
    version: '0.3.0',
    date: '2024-11-01',
    notes: ['프로토타입 버전', '핵심 기능 구현 시작'],
    current: false,
  },
];

export function AboutPage() {
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [_currentTab, setCurrentTab] = useState('recent');

  // 업데이트 확인 함수
  const checkForUpdates = () => {
    setIsCheckingUpdate(true);

    // 실제로는 서버에 업데이트 확인 요청을 보내야 함
    setTimeout(() => {
      setIsCheckingUpdate(false);
      toast.success('업데이트 확인 완료', {
        description: '현재 최신 버전을 사용 중입니다.',
      });
    }, 2000);
  };

  // 최근 업데이트와 모든 업데이트로 분리
  const recentUpdates = UPDATES.slice(0, 3);
  const allUpdates = UPDATES;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 프로그램 정보 카드 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>업무 모니터링 시스템</CardTitle>
            <Badge variant="outline" className="text-base px-3 py-1">
              버전 {APP_VERSION}
            </Badge>
          </div>
          <CardDescription>업무 사이트의 새로운 요청을 자동으로 모니터링하고 알림을 제공하는 프로그램입니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end">
          <Button variant="outline" onClick={checkForUpdates} disabled={isCheckingUpdate}>
            {isCheckingUpdate ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                업데이트 확인 중...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                업데이트 확인
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 업데이트 기록 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>업데이트 기록</CardTitle>
          <CardDescription>프로그램의 버전별 업데이트 내역을 확인하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="recent" onValueChange={setCurrentTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="recent">최근 업데이트</TabsTrigger>
              <TabsTrigger value="all">전체 업데이트</TabsTrigger>
            </TabsList>

            <TabsContent value="recent">
              <div className="space-y-4">
                {recentUpdates.map((update, index) => (
                  <div key={index} className="border rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <h3 className="font-medium">버전 {update.version}</h3>
                        {update.current && (
                          <Badge className="ml-2" variant="secondary">
                            현재 버전
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{update.date}</span>
                    </div>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mt-2">
                      {update.notes.map((note, noteIndex) => (
                        <li key={noteIndex}>{note}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="all">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {allUpdates.map((update, index) => (
                    <div key={index} className={`border rounded-md p-4 ${update.current ? 'border-primary' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <h3 className="font-medium">버전 {update.version}</h3>
                          {update.current && (
                            <Badge className="ml-2" variant="secondary">
                              현재 버전
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{update.date}</span>
                      </div>
                      <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mt-2">
                        {update.notes.map((note, noteIndex) => (
                          <li key={noteIndex}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
