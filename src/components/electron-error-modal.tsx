import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ElectronErrorModalProps {
  isOpen: boolean;
  onReload: () => void;
}

export function ElectronErrorModal({ isOpen, onReload }: ElectronErrorModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md hideCloseButton">
        <DialogHeader>
          <DialogTitle>앱 초기화 오류</DialogTitle>
          <DialogDescription>데스크톱 앱 기능을 초기화하는 데 문제가 발생했습니다.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-4">
          <div className="rounded-md bg-amber-50 p-4 dark:bg-amber-900/20">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-400">Electron API를 찾을 수 없습니다</h3>
                <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                  <p>이 문제는 다음과 같은 이유로 발생할 수 있습니다:</p>
                  <ul className="list-disc space-y-1 pl-5 mt-2">
                    <li>앱이 완전히 로드되지 않았습니다</li>
                    <li>앱 초기화 중 오류가 발생했습니다</li>
                    <li>브라우저에서 앱을 실행하고 있습니다 (데스크톱 앱에서만 사용 가능)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={onReload} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />앱 새로고침
          </Button>
          <div className="text-xs text-muted-foreground">문제가 계속되면 앱을 재시작하거나 관리자에게 문의하세요</div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
