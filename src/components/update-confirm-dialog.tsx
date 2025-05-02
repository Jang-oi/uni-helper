'use client';

import { Download, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface UpdateConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentVersion: string;
  newVersion: string;
}

export function UpdateConfirmDialog({ isOpen, onClose, onConfirm, currentVersion, newVersion }: UpdateConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 업데이트가 있습니다</DialogTitle>
          <DialogDescription>새 버전의 업데이트가 있습니다. 지금 업데이트하시겠습니까?</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-4">
          <div className="rounded-md bg-muted p-4">
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">현재 버전:</span>
                <span className="text-sm">{currentVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">새 버전:</span>
                <span className="text-sm text-primary font-medium">{newVersion}</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            업데이트를 다운로드하면 백그라운드에서 설치가 진행되며, 완료 후 앱을 재시작하여 적용할 수 있습니다.
          </p>
        </div>
        <DialogFooter className="flex flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
            <X className="h-4 w-4" />
            나중에
          </Button>
          <Button onClick={onConfirm} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            업데이트 다운로드
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
