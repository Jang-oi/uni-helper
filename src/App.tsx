'use client';

import { useEffect, useState } from 'react';

import { AboutPage } from '@/pages/about-page';
import { AlertsPage } from '@/pages/alerts-page';
import { SettingsPage } from '@/pages/settings-page';
import { HashRouter, Route, Routes } from 'react-router-dom';

import { AppSidebar } from '@/components/app-sidebar';
import { ElectronErrorModal } from '@/components/electron-error-modal';
import { SiteHeader } from '@/components/layout/site-header';
import { LoadingOverlay } from '@/components/loading-overlay';
import { ThemeProvider } from '@/components/theme-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';

import { useAppStore } from '@/store/app-store';

export function App() {
  const { isLoading, loadingMessage, setElectronAvailable } = useAppStore();
  const [showElectronError, setShowElectronError] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);

  // Electron 환경 확인 함수
  const checkElectronAvailability = () => {
    const isElectronAvailable = typeof window !== 'undefined' && !!window.electron;
    setElectronAvailable(isElectronAvailable);

    // 데스크톱 앱인데 Electron API가 없는 경우 오류 표시
    if (!isElectronAvailable) {
      // 초기화 중에는 바로 오류를 표시하지 않고, 일정 시간 후에도 API가 없으면 표시
      if (checkCount >= 2) {
        setShowElectronError(true);
      } else {
        // 최대 3번까지 재시도
        setTimeout(() => {
          setCheckCount((prev) => prev + 1);
        }, 1000); // 1초 후 재시도
      }
    } else {
      setShowElectronError(false);
      setIsInitializing(false);
    }

    return isElectronAvailable;
  };

  // 앱 초기화 시 Electron 환경 확인
  useEffect(() => {
    checkElectronAvailability();
  }, [checkCount, setElectronAvailable]);

  // 앱 새로고침 함수
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <ThemeProvider defaultTheme="light" storageKey="app-theme">
      <LoadingOverlay isVisible={isLoading || isInitializing} message={isInitializing ? '앱 초기화 중...' : loadingMessage} />
      <ElectronErrorModal isOpen={showElectronError} onReload={handleReload} />

      <HashRouter>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <SiteHeader />
            <main className="px-4 md:px-10 lg:px-20 py-6">
              <Routes>
                <Route path="/" element={<SettingsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/about" element={<AboutPage />} />
              </Routes>
            </main>
          </SidebarInset>
          <Toaster position="top-right" richColors />
        </SidebarProvider>
      </HashRouter>
    </ThemeProvider>
  );
}
