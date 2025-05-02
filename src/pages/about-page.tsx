import { useEffect, useState } from 'react';

import { ArrowDownToLine, CheckCircle, Download, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { UpdateConfirmDialog } from '@/components/update-confirm-dialog';

import { useAppStore } from '@/store/app-store';

// 업데이트 상태 타입
type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error' | 'confirm';

// 앱 정보 타입
interface AppInfo {
  version: string;
  name: string;
  isDevMode: boolean;
}

export function AboutPage() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const { setLoading } = useAppStore();

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

  // 업데이트 이벤트 리스너 등록
  useEffect(() => {
    const unsubscribe = window.electron.on('update-status', (data) => {
      const { status, ...rest } = data;

      switch (status) {
        case 'checking':
          setUpdateStatus('checking');
          break;
        case 'available':
          // 자동 다운로드 대신 확인 상태로 변경
          setUpdateStatus('confirm');
          setUpdateInfo(rest);
          break;
        case 'not-available':
          setUpdateStatus('not-available');
          toast.success('최신 버전을 사용 중입니다');
          break;
        case 'progress':
          setUpdateStatus('downloading');
          setDownloadProgress(rest.percent || 0);
          break;
        case 'downloaded':
          setUpdateStatus('downloaded');
          toast.success('업데이트 다운로드 완료', {
            description: '앱을 재시작하여 업데이트를 적용할 수 있습니다.',
          });
          break;
        case 'error':
          setUpdateStatus('error');
          toast.error('업데이트 오류', {
            description: rest.error || '업데이트 중 오류가 발생했습니다.',
          });
          break;
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // 업데이트 확인 함수
  const checkForUpdates = async () => {
    try {
      setUpdateStatus('checking');
      // 전역 로딩 상태 활성화
      setLoading(true, '업데이트를 확인하는 중입니다...');
      await window.electron.invoke('check-for-updates');
    } catch (error) {
      console.error('업데이트 확인 실패:', error);
      setUpdateStatus('error');
      toast.error('업데이트 확인 실패');
    } finally {
      // 로딩 상태 비활성화
      setLoading(false);
    }
  };

  // 업데이트 다운로드 함수
  const downloadUpdate = async () => {
    try {
      setUpdateStatus('downloading');
      setDownloadProgress(0);
      await window.electron.invoke('download-update');
    } catch (error) {
      console.error('업데이트 다운로드 실패:', error);
      toast.error('업데이트 다운로드 실패');
      setUpdateStatus('error');
    }
  };

  // 업데이트 설치 함수
  const installUpdate = async () => {
    try {
      await window.electron.invoke('install-update');
    } catch (error) {
      console.error('업데이트 설치 실패:', error);
      toast.error('업데이트 설치 실패');
    }
  };

  // 대화상자 닫기 함수
  const closeUpdateDialog = () => {
    setUpdateStatus('available');
  };

  // 업데이트 상태에 따른 UI 렌더링
  const renderUpdateUI = () => {
    switch (updateStatus) {
      case 'idle':
        return (
          <Button variant="outline" onClick={checkForUpdates} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            업데이트 확인
          </Button>
        );
      case 'checking':
        return (
          <Button variant="outline" disabled className="w-full">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            업데이트 확인 중...
          </Button>
        );
      case 'confirm':
        // 업데이트 확인 대화상자가 표시되므로 버튼 숨김
        return null;
      case 'available':
        return (
          <div className="space-y-4">
            <Alert>
              <Download className="h-4 w-4" />
              <AlertTitle>새 버전이 있습니다</AlertTitle>
              <AlertDescription>
                현재 버전: {appInfo?.version || '1.0.0'}
                <br />새 버전: {updateInfo?.version || '새 버전'}
                <br />
                업데이트를 다운로드하려면 아래 버튼을 클릭하세요.
              </AlertDescription>
            </Alert>
            <Button variant="default" onClick={downloadUpdate} className="w-full">
              <ArrowDownToLine className="h-4 w-4 mr-2" />
              업데이트 다운로드
            </Button>
          </div>
        );
      case 'downloading':
        return (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
              <h3 className="text-sm font-medium mb-2">업데이트 다운로드 중...</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>다운로드 진행률</span>
                  <span className="font-medium">{Math.round(downloadProgress)}%</span>
                </div>
                <Progress value={downloadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  다운로드가 완료될 때까지 기다려주세요. 다운로드 속도는 인터넷 연결 상태에 따라 달라질 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        );
      case 'downloaded':
        return (
          <div className="space-y-4">
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle>업데이트 다운로드 완료</AlertTitle>
              <AlertDescription>
                새 버전 {updateInfo?.version || ''}이(가) 다운로드되었습니다. 지금 업데이트를 설치하시겠습니까?
              </AlertDescription>
            </Alert>
            <Button variant="default" onClick={installUpdate} className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              지금 업데이트 설치
            </Button>
          </div>
        );
      case 'not-available':
        return (
          <div className="space-y-4">
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle>최신 버전 사용 중</AlertTitle>
              <AlertDescription>현재 최신 버전({appInfo?.version})을 사용하고 있습니다.</AlertDescription>
            </Alert>
            <Button variant="outline" onClick={checkForUpdates} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              다시 확인
            </Button>
          </div>
        );
      case 'error':
        return (
          <div className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>업데이트 오류</AlertTitle>
              <AlertDescription>업데이트를 확인하는 중 오류가 발생했습니다. 인터넷 연결을 확인하고 다시 시도하세요.</AlertDescription>
            </Alert>
            <Button variant="outline" onClick={checkForUpdates} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              다시 시도
            </Button>
          </div>
        );
      default:
        return (
          <Button variant="outline" onClick={checkForUpdates} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            업데이트 확인
          </Button>
        );
    }
  };

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
        <CardContent>
          <div className="space-y-4">
            <UpdateConfirmDialog
              isOpen={updateStatus === 'confirm'}
              onClose={closeUpdateDialog}
              onConfirm={downloadUpdate}
              currentVersion={appInfo?.version || '1.0.0'}
              newVersion={updateInfo?.version || '새 버전'}
            />

            <div className="flex flex-col space-y-2">
              <h3 className="text-sm font-medium">자동 업데이트</h3>
              <p className="text-sm text-muted-foreground">최신 버전이 있는지 확인하고 자동으로 업데이트합니다.</p>
              <div className="mt-2">{renderUpdateUI()}</div>
            </div>
          </div>
        </CardContent>
        <Separator />
        <CardFooter className="pt-4">
          <div className="w-full text-xs text-muted-foreground">
            <p>© 2024 Uni-Helper-App. All rights reserved.</p>
            <p className="mt-1">업무 시간(평일 07:00~20:00)에만 모니터링이 작동합니다.</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
