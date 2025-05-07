'use client';

import { useEffect, useState } from 'react';

import { ArrowUpCircle, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { UpdateDialog } from '@/components/update-dialog';

import { useAlertDialogStore } from '@/store/alert-dialog-store';

// 앱 정보 타입
interface AppInfo {
  version: string;
}

// 업데이트 상태 타입
type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';

// 업데이트 정보 타입
interface UpdateInfo {
  version?: string;
  releaseDate?: string;
  releaseNotes?: string;
  error?: string;
  percent?: number;
  bytesPerSecond?: number;
  total?: number;
  transferred?: number;
}

export function AboutPage() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({});
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const { openConfirm } = useAlertDialogStore();

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
    const updateListener = window.electron.on('update-status', (data) => {
      const { status, ...info } = data;

      setUpdateStatus(status);
      setUpdateInfo(info);

      // 업데이트 상태에 따른 처리
      switch (status) {
        case 'checking':
          toast.info('업데이트 확인 중', {
            description: '새로운 버전이 있는지 확인하고 있습니다.',
          });
          break;
        case 'available':
          // 업데이트 다운로드 확인 다이얼로그 표시
          openConfirm({
            title: '업데이트 다운로드',
            description: `새 버전 ${info.version}이(가) 사용 가능합니다.${info.releaseDate ? ` (출시일: ${info.releaseDate})` : ''}
            \n\n다운로드를 진행하시겠습니까?`,
            confirmText: '다운로드',
            cancelText: '나중에',
            onConfirm: () => {
              downloadUpdate();
            },
          });
          break;
        case 'not-available':
          toast.success('최신 버전 사용 중', {
            description: '현재 최신 버전을 사용하고 있습니다.',
          });
          break;
        case 'downloading':
          // 다운로드 다이얼로그 표시
          setIsDownloadDialogOpen(true);
          break;
        case 'downloaded':
          // 다운로드 다이얼로그 닫기
          setIsDownloadDialogOpen(false);

          // 설치 확인 다이얼로그 표시
          openConfirm({
            title: '업데이트 설치',
            description: `버전 ${info.version}이(가) 다운로드되었습니다. 지금 설치하시겠습니까?
            \n설치를 위해 프로그램이 재시작됩니다.`,
            confirmText: '지금 설치',
            cancelText: '나중에',
            onConfirm: () => {
              installUpdate();
            },
          });
          break;
        case 'error':
          toast.error('업데이트 오류', {
            description: info.error || '업데이트 중 오류가 발생했습니다.',
          });
          // 다운로드 다이얼로그 닫기
          setIsDownloadDialogOpen(false);
          break;
      }
    });

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      if (typeof updateListener === 'function') updateListener();
    };
  }, [openConfirm]);

  // 업데이트 확인 함수
  const checkForUpdates = async () => {
    try {
      setUpdateStatus('checking');
      await window.electron.invoke('check-for-updates');
    } catch (error) {
      console.error('업데이트 확인 중 오류:', error);
      setUpdateStatus('error');
      setUpdateInfo({ error: String(error) });
    }
  };

  // 업데이트 다운로드 함수
  const downloadUpdate = async () => {
    try {
      await window.electron.invoke('download-update');
    } catch (error) {
      console.error('업데이트 다운로드 중 오류:', error);
      setUpdateStatus('error');
      setUpdateInfo({ error: String(error) });
    }
  };

  // 업데이트 설치 함수
  const installUpdate = async () => {
    try {
      await window.electron.invoke('install-update');
    } catch (error) {
      console.error('업데이트 설치 중 오류:', error);
      setUpdateStatus('error');
      setUpdateInfo({ error: String(error) });
    }
  };

  // 업데이트 상태에 따른 UI 렌더링
  const renderUpdateUI = () => {
    switch (updateStatus) {
      case 'idle':
        return (
          <Button onClick={checkForUpdates} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            업데이트 확인
          </Button>
        );

      case 'checking':
        return (
          <Button disabled className="w-full">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            업데이트 확인 중...
          </Button>
        );

      case 'not-available':
        return (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/20">
              <CheckCircle className="h-5 w-5 mt-0.5 text-green-600 dark:text-green-400" />
              <div>
                <h4 className="text-sm font-medium text-green-800 dark:text-green-300">최신 버전 사용 중</h4>
                <p className="text-sm text-green-700 dark:text-green-400">현재 최신 버전({appInfo?.version})을 사용하고 있습니다.</p>
              </div>
            </div>
            <Button onClick={checkForUpdates} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 확인
            </Button>
          </div>
        );

      case 'available':
        return (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
              <ArrowUpCircle className="h-5 w-5 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">새 버전 사용 가능</h4>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  새 버전 {updateInfo.version}이(가) 사용 가능합니다.
                  {updateInfo.releaseDate && ` (출시일: ${updateInfo.releaseDate})`}
                </p>
              </div>
            </div>
            <Button onClick={downloadUpdate} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              업데이트 다운로드
            </Button>
          </div>
        );

      case 'downloaded':
        return (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/20">
              <CheckCircle className="h-5 w-5 mt-0.5 text-green-600 dark:text-green-400" />
              <div>
                <h4 className="text-sm font-medium text-green-800 dark:text-green-300">업데이트 준비 완료</h4>
                <p className="text-sm text-green-700 dark:text-green-400">
                  버전 {updateInfo.version}이(가) 다운로드되었습니다. 지금 설치하려면 아래 버튼을 클릭하세요.
                </p>
              </div>
            </div>
            <Button onClick={installUpdate} className="w-full">
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              지금 업데이트 설치
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
              <XCircle className="h-5 w-5 mt-0.5 text-red-600 dark:text-red-400" />
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-300">업데이트 오류</h4>
                <p className="text-sm text-red-700 dark:text-red-400">{updateInfo.error || '업데이트 중 오류가 발생했습니다.'}</p>
              </div>
            </div>
            <Button onClick={checkForUpdates} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 시도
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 다운로드 진행 다이얼로그 */}
      <UpdateDialog
        isOpen={isDownloadDialogOpen}
        onClose={() => setIsDownloadDialogOpen(false)}
        version={updateInfo.version || ''}
        progress={updateInfo.percent || 0}
        downloadSpeed={updateInfo.bytesPerSecond || 0}
        transferred={updateInfo.transferred || 0}
        total={updateInfo.total || 0}
        onComplete={() => {
          // 다운로드 완료 시 자동으로 닫지 않음 - 사용자가 확인 버튼을 누르면 닫힘
        }}
      />

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
        <Separator />
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">업데이트 관리</h3>
          {renderUpdateUI()}
        </CardContent>
        {updateInfo.releaseNotes && (
          <CardFooter className="flex flex-col items-start">
            <h4 className="text-sm font-semibold mb-2">변경 사항:</h4>
            <div className="text-sm text-muted-foreground whitespace-pre-line w-full bg-muted p-3 rounded-md">
              {updateInfo.releaseNotes}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
