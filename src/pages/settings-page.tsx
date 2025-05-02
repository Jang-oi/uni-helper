'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

import { useAppStore } from '@/store/app-store';

const formSchema = z.object({
  username: z.string().min(1, { message: '아이디를 입력해주세요' }),
  password: z.string().min(1, { message: '비밀번호를 입력해주세요' }),
  checkInterval: z.coerce.number().min(1, { message: '최소 1분 이상 설정해주세요' }).max(60, { message: '최대 60분까지 설정 가능합니다' }),
  enableNotifications: z.boolean().default(true),
});

type SettingsFormValues = z.infer<typeof formSchema>;

export function SettingsPage() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isBusinessHours, setIsBusinessHours] = useState(true);
  const { setMonitoring, setLoading, isLoading, isMonitoring } = useAppStore();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      checkInterval: 5,
      enableNotifications: true,
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
        const settings = await window.electron.invoke('get-settings');
        if (settings) {
          // 설정 적용
          const { username, password, checkInterval, enableNotifications } = settings;
          form.reset({
            username,
            password,
            checkInterval,
            enableNotifications: enableNotifications !== false, // 기본값은 true
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
      // 설정 저장 단계
      setLoading(true, '설정을 저장하고 있습니다...');
      // 설정 저장이 완료될 때까지 기다림
      await window.electron.invoke('save-settings', values);

      const newStatus = !isMonitoring;

      if (newStatus) setLoading(true, '모니터링을 설정을 하고 있습니다...');
      else setLoading(true, '모니터링을 중지하고 있습니다...');

      setMonitoring(newStatus); // 모니터링 상태 업데이트

      const result = await window.electron.invoke('toggle-monitoring', newStatus);

      if (result.success) {
        setMonitoring(newStatus);
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
      setLoading(false);
    }
  }

  return (
    <>
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
                          <Input {...field} disabled={isMonitoring} />
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
                          <Input type="password" {...field} disabled={isMonitoring} />
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
                        <Input type="number" min={1} max={60} {...field} disabled={isMonitoring} />
                      </FormControl>
                      <FormDescription>업무 사이트를 확인할 주기를 분 단위로 설정하세요. (최소 1분)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enableNotifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">알림 설정</FormLabel>
                        <FormDescription>새로운 업무 요청이나 상태 변경 시 알림을 받을지 설정합니다.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          className="cursor-pointer"
                          checked={field.value}
                          onCheckedChange={async (checked) => {
                            field.onChange(checked);
                            try {
                              // 현재 설정 가져오기
                              const currentSettings = (await window.electron.invoke('get-settings')) || {};
                              // 알림 설정만 업데이트
                              const updatedSettings = {
                                ...currentSettings,
                                enableNotifications: checked,
                              };
                              // 설정 저장
                              await window.electron.invoke('save-settings', updatedSettings);
                              toast.success(checked ? '알림이 활성화되었습니다' : '알림이 비활성화되었습니다');
                            } catch (error) {
                              console.error('알림 설정 저장 실패:', error);
                              toast.error('알림 설정 저장에 실패했습니다');
                            }
                          }}
                        />
                      </FormControl>
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
                    <Button type="submit" variant={isMonitoring ? 'destructive' : 'default'} disabled={isLoading || !isBusinessHours}>
                      {isMonitoring ? '모니터링 중지' : '모니터링 시작'}
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
