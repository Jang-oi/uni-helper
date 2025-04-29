import { useState } from 'react';

import { Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// 버전 정보
const APP_VERSION = '1.0.0';

export function AboutPage() {
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

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
    </div>
  );
}
