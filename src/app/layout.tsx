import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import { GamificationProvider } from '@/contexts/gamification-context';
import { Analytics } from "@vercel/analytics/next";
import { ErrorBoundary } from '@/components/error-boundary';
import { ChunkErrorBoundary } from '@/components/chunk-error-boundary';                                                                  
export const metadata: Metadata = {
  title: 'StudyMaster AI',
  description: 'AI-powered gamified learning platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <ErrorBoundary>
          <AuthProvider>
            <GamificationProvider>
              {children}
              <Toaster />
              <Analytics />
            </GamificationProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}