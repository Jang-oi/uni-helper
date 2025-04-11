import { useEffect, useState } from 'react';

import { Bell, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AlertItem {
  id: string;
  title: string;
  status: string;
  timestamp: string;
  isNew: boolean;
}

export function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      if (!window.electron) {
        console.error('Electron API not available');
        return;
      }

      const result = await window.electron.invoke('get-alerts');
      setAlerts(result.alerts || []);
      setLastChecked(result.lastChecked || null);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      toast.error('알림 로드 실패', {
        description: '알림 내역을 불러오는 중 오류가 발생했습니다.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const clearAlerts = async () => {
    try {
      if (!window.electron) {
        toast.error('Electron API not available');
        return;
      }

      await window.electron.invoke('clear-alerts');
      setAlerts([]);
      toast.success('알림 내역이 삭제되었습니다');
    } catch (error) {
      toast.error('알림 삭제 실패');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              알림 내역
            </CardTitle>
            <CardDescription>{lastChecked ? `마지막 확인: ${lastChecked}` : '아직 확인된 내역이 없습니다'}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadAlerts} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            <Button variant="outline" size="sm" onClick={clearAlerts}>
              알림 삭제
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">알림 내역이 없습니다</div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`p-4 border rounded-lg ${alert.isNew ? 'bg-muted' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{alert.title}</h3>
                      <Badge variant={alert.isNew ? 'default' : 'outline'}>{alert.status}</Badge>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {alert.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
