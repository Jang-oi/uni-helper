import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  username: z.string().min(1, { message: '아이디를 입력해주세요' }),
  password: z.string().min(1, { message: '비밀번호를 입력해주세요' }),
  checkInterval: z.coerce.number().min(1, { message: '최소 1분 이상 설정해주세요' }).max(60, { message: '최대 60분까지 설정 가능합니다' }),
});

type SettingsFormValues = z.infer<typeof formSchema>;

export function SettingsPage() {
  const [isTesting, setIsTesting] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      checkInterval: 5,
    },
  });

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
          // URL은 제외하고 나머지 설정만 폼에 적용
          const { username, password, checkInterval } = settings;
          form.reset({ username, password, checkInterval });
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

      // 고정 URL 추가
      const settingsWithUrl = {
        ...values,
        workSiteUrl: 'https://114.unipost.co.kr',
      };

      await window.electron.invoke('save-settings', settingsWithUrl);
      toast.success('설정이 저장되었습니다');
    } catch (error) {
      toast.error('설정 저장 실패', {
        description: '설정을 저장하는 중 오류가 발생했습니다.',
      });
    }
  }

  async function testConnection() {
    setIsTesting(true);
    try {
      if (!window.electron) {
        toast.error('Electron API not available');
        return;
      }

      // 고정 URL 추가
      const testSettings = {
        ...form.getValues(),
        workSiteUrl: 'https://114.unipost.co.kr',
      };

      const result = await window.electron.invoke('test-connection', testSettings);
      if (result.success) {
        toast.success('연결 테스트 성공', {
          description: '업무 사이트에 성공적으로 연결되었습니다.',
        });
      } else {
        toast.error('연결 테스트 실패', {
          description: result.message || '업무 사이트에 연결할 수 없습니다.',
        });
      }
    } catch (error) {
      console.error('Test connection error:', error);
      toast.error('연결 테스트 실패', {
        description: '업무 사이트에 연결할 수 없습니다.',
      });
    } finally {
      setIsTesting(false);
    }
  }

  async function toggleMonitoring() {
    try {
      if (!window.electron) {
        toast.error('Electron API not available');
        return;
      }

      const newStatus = !isMonitoring;
      await window.electron.invoke('toggle-monitoring', newStatus);
      setIsMonitoring(newStatus);

      if (newStatus) {
        toast.success('모니터링 시작', {
          description: `${form.getValues().checkInterval}분 간격으로 업무 요청을 확인합니다.`,
        });
      } else {
        toast.info('모니터링 중지');
      }
    } catch (error) {
      toast.error('모니터링 상태 변경 실패');
    }
  }

  // Check monitoring status on component mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        if (!window.electron) {
          console.error('Electron API not available');
          return;
        }

        const status = await window.electron.invoke('get-monitoring-status');
        setIsMonitoring(status);
      } catch (error) {
        console.error('Failed to get monitoring status:', error);
      }
    };

    checkStatus();
  }, []);

  return (
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
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={testConnection} disabled={isTesting}>
                  {isTesting ? '테스트 중...' : '연결 테스트'}
                </Button>
                <div className="space-x-2">
                  <Button type="submit">설정 저장</Button>
                  <Button type="button" variant={isMonitoring ? 'destructive' : 'default'} onClick={toggleMonitoring}>
                    {isMonitoring ? '모니터링 중지' : '모니터링 시작'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
