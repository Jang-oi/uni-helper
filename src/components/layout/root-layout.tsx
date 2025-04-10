import { Outlet } from 'react-router-dom';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import {SiteHeader} from "@/components/layout/site-header.tsx";

export function RootLayout() {
    return (
        <SidebarProvider>
            <AppSidebar/>
            <SidebarInset>
                <SiteHeader />
                <main className="px-4 md:px-10 lg:px-20 py-6">
                    <Outlet />
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
