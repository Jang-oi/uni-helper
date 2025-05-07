import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// 앱 정보 타입
interface AppInfo {
  version: string;
  name: string;
  isDevMode: boolean;
}

export function AboutPage() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  // 앱 정보 로드
  useEffect(() => {
    const loadAppInfo = async () => {
      try {
        const info = await window.electron.invoke('get-app-info');
        setAppInfo(info);
      } catch (error) {
        console.error('앱 정보 로드 실패:', error);
      }
    };

    loadAppInfo();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 프로그램 정보 카드 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>업무 모니터링 시스템</CardTitle>
            <Badge variant="outline" className="text-base px-3 py-1">
              버전 {appInfo?.version || '1.0.0'}
            </Badge>
          </div>
          <CardDescription>업무 사이트의 새로운 요청을 자동으로 모니터링하고 알림을 제공하는 프로그램입니다.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
