import { useCallback, useEffect, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, Clock, Info, Laptop, Lock, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAppStore } from '@/store/app-store';

const formSchema = z.object({
  username: z.string().min(1, { message: '아이디를 입력해주세요' }),
  password: z.string().min(1, { message: '비밀번호를 입력해주세요' }),
  checkInterval: z.coerce.number().min(1, { message: '최소 1분 이상 설정해주세요' }).max(40, { message: '최대 40분까지 설정 가능합니다' }),
  enableNotifications: z.boolean().default(true),
  startAtLogin: z.boolean().default(false),
});

type SettingsFormValues = z.infer<typeof formSchema>;

export function SettingsPage() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isBusinessHours, setIsBusinessHours] = useState(true);
  const [activeTab, setActiveTab] = useState('account');
  const { setMonitoring, setLoading, isLoading, isMonitoring, syncMonitoringStatus } = useAppStore();

  // 탭 참조 생성
  const tabsRef = useRef<HTMLDivElement>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      checkInterval: 5,
      enableNotifications: true,
      startAtLogin: false,
    },
  });

  // 현재 시간이 업무 시간인지 확인 (07:00 ~ 20:00 KST)
  const checkBusinessHours = useCallback(() => {
    const now = new Date();
    const hours = now.getHours();
    const isWithinBusinessHours = hours >= 7 && hours < 20;

    // 상태 업데이트가 필요한 경우에만 업데이트
    if (isWithinBusinessHours !== isBusinessHours) setIsBusinessHours(isWithinBusinessHours);
    // 현재 시간 표시 (한국 시간)
    const timeString = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // 시간이 변경된 경우에만 업데이트
    if (timeString !== currentTime) setCurrentTime(timeString);
    return isWithinBusinessHours;
  }, [isBusinessHours, currentTime]);

  // 주기적으로 업무 시간 확인
  useEffect(() => {
    // 초기 확인
    checkBusinessHours();

    // 1분마다 확인
    const interval = setInterval(checkBusinessHours, 60000);
    return () => clearInterval(interval);
  }, [checkBusinessHours]);

  // 컴포넌트 마운트 시 모니터링 상태 동기화
  useEffect(() => {
    syncMonitoringStatus();
  }, [syncMonitoringStatus]);

  // Load saved settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.electron.invoke('get-settings');
        if (settings) {
          // 설정 적용
          const { username, password, checkInterval, enableNotifications, startAtLogin } = settings;
          form.reset({
            username,
            password,
            checkInterval,
            enableNotifications: enableNotifications !== false, // 기본값은 true
            startAtLogin: startAtLogin === true, // 기본값은 false
          });
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, [form]);

  // 모니터링 상태 변경 이벤트 리스너
  useEffect(() => {
    const unsubscribe = window.electron.on('monitoring-status-changed', (status) => {
      setMonitoring(status.isMonitoring);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [setMonitoring]);

  // 탭 변경 함수 - 튜토리얼에서 사용
  const changeTab = useCallback((tabValue: string) => {
    setActiveTab(tabValue);
  }, []);

  // 튜토리얼에서 탭 변경을 위한 전역 함수 등록
  useEffect(() => {
    // @ts-ignore - 전역 객체에 함수 추가
    window.__changeSettingsTab = changeTab;

    return () => {
      // @ts-ignore - 컴포넌트 언마운트 시 제거
      delete window.__changeSettingsTab;
    };
  }, [changeTab]);

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

  const updateSingleSetting = async (key: string, value: any) => {
    try {
      // 현재 설정 가져오기
      const currentSettings = (await window.electron.invoke('get-settings')) || {};
      // 특정 설정만 업데이트
      const updatedSettings = {
        ...currentSettings,
        [key]: value,
      };
      // 설정 저장
      await window.electron.invoke('save-settings', updatedSettings);
      return true;
    } catch (error) {
      console.error(`${key} 설정 저장 실패:`, error);
      return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-tutorial="settings-page">
      <div className="bg-muted/30 p-4 rounded-lg mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isMonitoring ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium">업무 시간 모니터링 상태</h3>
            <p className="text-sm text-muted-foreground">
              {isMonitoring ? '모니터링 중' : '모니터링 중지됨'} • 현재 시간: {currentTime} (
              {isBusinessHours ? '업무 시간' : '업무 시간 외'})
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full settings-tabs" ref={tabsRef}>
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="account" className="flex items-center gap-2" data-tutorial="account-tab">
            <User className="h-4 w-4" />
            <span>계정 정보</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2" data-tutorial="notifications-tab">
            <Bell className="h-4 w-4" />
            <span>알림 설정</span>
          </TabsTrigger>
          {/*          <TabsTrigger value="system" className="flex items-center gap-2" data-tutorial="system-tab">
            <Laptop className="h-4 w-4" />
            <span>시스템 설정</span>
          </TabsTrigger>*/}
        </TabsList>

        <Form {...form}>
          <TabsContent value="account" className="space-y-6">
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-medium mb-4">업무 사이트 접속 정보</h3>
              <p className="text-sm text-muted-foreground mb-6">
                업무 사이트(https://114.unipost.co.kr) 접속에 필요한 계정 정보를 입력하세요.
              </p>

              <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem data-tutorial="username-input">
                        <FormLabel>아이디</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input {...field} className="pl-9" disabled={isMonitoring} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem data-tutorial="password-input">
                        <FormLabel>비밀번호</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input type="password" {...field} className="pl-9" disabled={isMonitoring} />
                          </div>
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
                    <FormItem data-tutorial="interval-input">
                      <FormLabel>확인 주기 (분)</FormLabel>
                      <div className="flex items-center gap-4">
                        <FormControl>
                          <Input type="number" min={1} max={40} {...field} disabled={isMonitoring} className="max-w-[120px]" />
                        </FormControl>
                        <div className="flex-1">
                          <input
                            type="range"
                            min="1"
                            max="40"
                            value={field.value}
                            onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                            disabled={isMonitoring}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <FormDescription>업무 사이트를 확인할 주기를 분 단위로 설정하세요. (최소 1분, 최대 40분)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertTitle>업무 시간 모니터링</AlertTitle>
              <AlertDescription>모니터링은 평일 07:00~20:00 사이에만 작동합니다. 주말에는 모니터링하지 않습니다.</AlertDescription>
            </Alert>
            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant={isMonitoring ? 'destructive' : 'default'}
                disabled={isLoading}
                data-tutorial="monitoring-button"
                className="gap-2"
                onClick={form.handleSubmit(onSubmit)}
              >
                {isMonitoring ? '모니터링 중지' : '모니터링 시작'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-medium mb-4">알림 설정</h3>
              <p className="text-sm text-muted-foreground mb-6">새로운 업무 요청이나 상태 변경 시 알림을 받을지 설정합니다.</p>

              <FormField
                control={form.control}
                name="enableNotifications"
                render={({ field }) => (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border" data-tutorial="notification-switch">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Bell className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <FormLabel className="text-base">윈도우 알림</FormLabel>
                          <FormDescription>새로운 업무 요청이나 상태 변경 시 윈도우 알림을 표시합니다.</FormDescription>
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          className="cursor-pointer"
                          checked={field.value}
                          onCheckedChange={async (checked) => {
                            field.onChange(checked);
                            const success = await updateSingleSetting('enableNotifications', checked);
                            if (success) {
                              toast.success(checked ? '알림이 활성화되었습니다' : '알림이 비활성화되었습니다');
                            } else {
                              toast.error('알림 설정 저장에 실패했습니다');
                            }
                          }}
                        />
                      </FormControl>
                    </div>
                  </div>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-medium mb-4">시스템 설정</h3>
              <p className="text-sm text-muted-foreground mb-6">프로그램의 시스템 관련 설정을 구성합니다.</p>

              <FormField
                control={form.control}
                name="startAtLogin"
                render={({ field }) => (
                  <div className="flex items-center justify-between p-4 rounded-lg border" data-tutorial="startup-switch">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Laptop className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <FormLabel className="text-base">시작 프로그램 등록</FormLabel>
                        <FormDescription>컴퓨터 시작 시 프로그램을 자동으로 실행합니다.</FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        disabled={true}
                        className="cursor-pointer"
                        checked={field.value}
                        onCheckedChange={async (checked) => {
                          field.onChange(checked);
                          const success = await updateSingleSetting('startAtLogin', checked);
                          if (success) {
                            toast.success(checked ? '시작 프로그램에 등록되었습니다' : '시작 프로그램에서 제거되었습니다');
                          } else {
                            toast.error('시작 프로그램 설정 저장에 실패했습니다');
                          }
                        }}
                      />
                    </FormControl>
                  </div>
                )}
              />

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-base font-medium">자동 업데이트 확인</p>
                      <p className="text-sm text-muted-foreground">프로그램 시작 시 업데이트를 자동으로 확인합니다.</p>
                    </div>
                  </div>
                  <Switch disabled={true} />
                </div>
              </div>
            </div>
          </TabsContent>
        </Form>
      </Tabs>
    </div>
  );
}
