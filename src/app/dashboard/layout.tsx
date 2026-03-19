import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { WallpaperBackground } from '@/components/layout/wallpaper-background';
import { StudySessionProvider } from '@/contexts/study-session-context';
import { ProtectedRoute } from '@/components/auth/protected-route';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <StudySessionProvider>
        <WallpaperBackground>
          <AppSidebar />
          <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            <Header />
            <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
              {children}
            </main>
          </div>
        </WallpaperBackground>
      </StudySessionProvider>
    </ProtectedRoute>
  );
}
