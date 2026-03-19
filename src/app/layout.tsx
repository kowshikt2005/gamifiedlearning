import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import { GamificationProvider } from '@/contexts/gamification-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { Analytics } from "@vercel/analytics/next";
import { ErrorBoundary } from '@/components/error-boundary';
// Removed unused import                                                                  
export const metadata: Metadata = {
  title: 'StudyMaster AI',
  description: 'A gamified learning platform that makes studying actually fun',
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
          <ThemeProvider>
            <AuthProvider>
              <GamificationProvider>
                {children}
                <Toaster />
                <Analytics />
              </GamificationProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}