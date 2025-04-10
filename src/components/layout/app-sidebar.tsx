import { useEffect, useState } from 'react';

import { Bell, Clock, GalleryVerticalEnd, Home, Play, RefreshCw, Settings, Shield } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

interface AppSidebarProps {
  variant?: 'sidebar' | 'floating' | 'inset';
}

export function AppSidebar({ variant = 'inset' }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [newAlerts, setNewAlerts] = useState(3);
  const [status, setStatus] = useState({
    isRunning: true,
    lastCrawl: '2023년 4월 9일 15:34',
    nextCrawl: '15분 후',
  });
  const [automationRunning, setAutomationRunning] = useState(false);

  const startManualCrawl = () => {
    toast.success('크롤링 시작', {
      description: '수동 크롤링이 시작되었습니다.',
    });
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <Sidebar variant={variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none ml-2">
                  <span className="font-semibold">업무 알림 시스템</span>
                  <span className="">v1.0.0</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/')} tooltip="홈">
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/');
                  }}
                >
                  <Home className="h-4 w-4" />
                  <span>홈</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/notifications')} tooltip="알림">
                <a
                  href="/notifications"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/notifications');
                  }}
                >
                  <Bell className="h-4 w-4" />
                  <span>알림</span>
                  {newAlerts > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {newAlerts}
                    </Badge>
                  )}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/automation')} tooltip="자동화">
                <a
                  href="/automation"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/automation');
                  }}
                >
                  <Play className="h-4 w-4" />
                  <span>자동화</span>
                  {automationRunning && <Badge className="ml-auto">실행중</Badge>}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/crawler-config')} tooltip="설정">
                <a
                  href="/crawler-config"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/crawler-config');
                  }}
                >
                  <Settings className="h-4 w-4" />
                  <span>설정</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <Separator className="my-4" />

        <SidebarGroup>
          <SidebarGroupLabel>크롤링 상태</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2 text-sm px-2">
              <div className="flex items-center">
                <div className={`mr-2 h-2 w-2 rounded-full ${status.isRunning ? 'bg-green-500' : 'bg-amber-500'}`} />
                <span>{status.isRunning ? '활성화됨' : '비활성화됨'}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Clock className="mr-2 h-3 w-3" />
                <span>마지막: {status.lastCrawl}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <RefreshCw className="mr-2 h-3 w-3" />
                <span>다음: {status.nextCrawl}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full" onClick={startManualCrawl}>
              <RefreshCw className="mr-2 h-3 w-3" />
              지금 크롤링
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <div className="px-2 py-2">
              <div className="rounded-md bg-muted p-3">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 text-primary mr-2" />
                  <h4 className="text-sm font-medium">보안 알림</h4>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">모든 자격 증명은 로컬에 안전하게 저장되며, 외부로 전송되지 않습니다.</p>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4">
          <div className="text-xs text-muted-foreground">
            <p>버전: 1.0.0</p>
            <p>© 2023 회사명</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
