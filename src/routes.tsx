import { Route, Routes as RouterRoutes } from 'react-router-dom';

import { RootLayout } from '@/components/layout/root-layout';
import HomePage from "@/pages/home/page.tsx";
import NotificationListPage from "@/pages/notification-list/page.tsx";
import CrawlerConfigPage from "@/pages/config/page.tsx";

export function Routes() {
  return (
    <RouterRoutes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/crawler-config" element={<CrawlerConfigPage />} />
        <Route path="/notifications" element={<NotificationListPage />} />
        {/*<Route path="/automation" element={<AutomationPage />} />*/}
      </Route>
    </RouterRoutes>
  );
}
