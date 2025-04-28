import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { LoadingOverlay } from '@/components/loading-overlay';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { useAppStore } from '@/store/app-store';

const formSchema = z.object({
  username: z.string().min(1, { message: '아이디를 입력해주세요' }),
  password: z.string().min(1, { message: '비밀번호를 입력해주세요' }),
  checkInterval: z.coerce.number().min(1, { message: '최소 1분 이상 설정해주세요' }).max(60, { message: '최대 60분까지 설정 가능합니다' }),
});

type SettingsFormValues = z.infer<typeof formSchema>;

export function SettingsPage() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isBusinessHours, setIsBusinessHours] = useState(true);
  const { setMonitoring, setSavingSettings, setLoading } = useAppStore();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      checkInterval: 5,
    },
  });

  // 현재 시간이 업무 시간인지 확인 (07:00 ~ 20:00 KST)
  const checkBusinessHours = () => {
    const now = new Date();
    const hours = now.getHours();
    const isWithinBusinessHours = hours >= 7 && hours < 20;
    setIsBusinessHours(isWithinBusinessHours);

    // 현재 시간 표시 (한국 시간)
    const timeString = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    setCurrentTime(timeString);

    return isWithinBusinessHours;
  };

  // 주기적으로 업무 시간 확인
  useEffect(() => {
    checkBusinessHours();
    const interval = setInterval(checkBusinessHours, 60000); // 1분마다 확인

    return () => clearInterval(interval);
  }, []);

  // Load saved settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (!window.electron) {
          console.error('Electron API not available');
          return;
        }

        const settings = await window.electron.invoke('get-settings');
        if (settings) {
          // 설정 적용
          const { username, password, checkInterval } = settings;
          form.reset({
            username,
            password,
            checkInterval,
          });
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, [form]);

  async function onSubmit(values: SettingsFormValues) {
    try {
      if (!window.electron) {
        toast.error('Electron API not available');
        return;
      }

      setIsLoading(true);
      setLoading(true, '설정을 저장하고 있습니다...');
      setSavingSettings(true); // 설정 저장 상태 업데이트

      await window.electron.invoke('save-settings', values);

      // 설정 저장 후 로그인 테스트
      setLoading(true, '로그인 테스트 중...');
      const loginTest = await window.electron.invoke('test-login');

      if (!loginTest.success) {
        console.log(loginTest);
        toast.error('로그인 테스트 실패', {
          description: '아이디와 비밀번호를 확인해주세요.',
        });
      } else {
        toast.success('설정이 저장되었습니다');

        // 모니터링 중인 경우 설정 변경 적용
        if (isMonitoring) {
          setLoading(true, '모니터링 설정을 업데이트하고 있습니다...');
          await window.electron.invoke('update-monitoring-settings');
          toast.info('모니터링 설정이 업데이트되었습니다', {
            description: `${values.checkInterval}분 간격으로 업데이트됩니다.`,
          });
        }
      }
    } catch (error) {
      toast.error('설정 저장 실패', {
        description: '설정을 저장하는 중 오류가 발생했습니다.',
      });
    } finally {
      setIsLoading(false);
      setLoading(false);
      setSavingSettings(false); // 설정 저장 상태 업데이트 완료
    }
  }

  async function toggleMonitoring() {
    try {
      if (!window.electron) {
        toast.error('Electron API not available');
        return;
      }

      setIsLoading(true);
      const newStatus = !isMonitoring;

      if (newStatus) {
        setLoading(true, '모니터링을 시작하고 있습니다...');
      } else {
        setLoading(true, '모니터링을 중지하고 있습니다...');
      }

      setMonitoring(newStatus); // 모니터링 상태 업데이트

      const result = await window.electron.invoke('toggle-monitoring', newStatus);

      if (result.success) {
        setIsMonitoring(newStatus);

        if (newStatus) {
          toast.success('모니터링 시작', {
            description: `${form.getValues().checkInterval}분 간격으로 업무 요청을 확인합니다.`,
          });
        } else {
          toast.info('모니터링 중지');
        }
      } else {
        toast.error('모니터링 시작 실패', {
          description: result.message || '로그인 정보를 확인해주세요.',
        });
        setMonitoring(false); // 모니터링 상태 업데이트 (실패 시 false로 설정)
      }
    } catch (error) {
      toast.error('모니터링 상태 변경 실패');
      setMonitoring(false); // 모니터링 상태 업데이트 (실패 시 false로 설정)
    } finally {
      setIsLoading(false);
      setLoading(false);
      if (!isMonitoring) {
        setMonitoring(false); // 모니터링 중지 시 상태 업데이트
      }
    }
  }

  // 이벤트 리스너 등록 및 모니터링 상태 확인
  useEffect(() => {
    if (!window.electron) {
      console.error('Electron API not available');
      return;
    }

    // 모니터링 상태 확인
    const checkStatus = async () => {
      try {
        const status = await window.electron.invoke('get-monitoring-status');
        setIsMonitoring(status);
        setMonitoring(status); // 앱 스토어 상태 업데이트
      } catch (error) {
        console.error('Failed to get monitoring status:', error);
      }
    };

    checkStatus();

    // 로그인 에러 이벤트 리스너 등록
    const loginErrorRemover = window.electron.on('login-error', (message: string) => {
      setIsMonitoring(false);
      setMonitoring(false); // 앱 스토어 상태 업데이트
      toast.error('로그인 오류', { description: message });
    });

    // 스크래핑 에러 이벤트 리스너 등록
    const scrapingErrorRemover = window.electron.on('scraping-error', (message: string) => {
      toast.error('데이터 수집 오류', { description: message });
    });

    // 모니터링 상태 변경 이벤트 리스너
    const monitoringStatusRemover = window.electron.on('monitoring-status-changed', (status: boolean) => {
      setIsMonitoring(status);
      setMonitoring(status); // 앱 스토어 상태 업데이트
      if (status) {
        toast.success('모니터링이 시작되었습니다');
      } else {
        toast.info('모니터링이 중지되었습니다');
      }
    });

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      if (typeof loginErrorRemover === 'function') loginErrorRemover();
      if (typeof scrapingErrorRemover === 'function') scrapingErrorRemover();
      if (typeof monitoringStatusRemover === 'function') monitoringStatusRemover();
    };
  }, [setMonitoring]);

  return (
    <>
      <LoadingOverlay isVisible={isLoading} />
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>업무 사이트 설정</CardTitle>
            <CardDescription>업무 사이트(https://114.unipost.co.kr) 접속 정보와 알림 설정을 구성하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>아이디</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>비밀번호</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="checkInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>확인 주기 (분)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={60} {...field} />
                      </FormControl>
                      <FormDescription>업무 사이트를 확인할 주기를 분 단위로 설정하세요. (최소 1분)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Alert className="mt-4">
                  <Clock className="h-4 w-4" />
                  <AlertTitle>업무 시간 모니터링</AlertTitle>
                  <AlertDescription>
                    모니터링은 평일 07:00~20:00 사이에만 작동합니다. 주말에는 모니터링하지 않습니다.
                    {currentTime && (
                      <div className="flex items-center mt-1 text-sm">
                        <span>
                          현재 시간: {currentTime} ({isBusinessHours ? '업무 시간' : '업무 시간 외'})
                        </span>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
                <div className="flex justify-between pt-4">
                  <div className="space-x-2">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          처리 중...
                        </>
                      ) : (
                        '설정 저장'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant={isMonitoring ? 'destructive' : 'default'}
                      onClick={toggleMonitoring}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          처리 중...
                        </>
                      ) : isMonitoring ? (
                        '모니터링 중지'
                      ) : (
                        '모니터링 시작'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
