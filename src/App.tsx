import { AboutPage } from '@/pages/about-page.tsx';
import { AlertsPage } from '@/pages/alerts-page';
import { SettingsPage } from '@/pages/settings-page';
import { HashRouter, Route, Routes } from 'react-router-dom';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/layout/site-header.tsx';
import { LoadingOverlay } from '@/components/loading-overlay.tsx';
import { ThemeProvider } from '@/components/theme-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';

import { useAppStore } from '@/store/app-store.ts';

export function App() {
  const { isLoading, loadingMessage } = useAppStore();

  return (
    <ThemeProvider defaultTheme="light" storageKey="app-theme">
      <LoadingOverlay isVisible={isLoading} message={loadingMessage} />
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
