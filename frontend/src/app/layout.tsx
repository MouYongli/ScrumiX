'use client';

import { useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ConditionalSidebar from "@/components/layout/ConditionalSidebar";
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  
  // Check if it's auth page or home page
  const isAuthPage = pathname?.startsWith('/auth');
  const isHomePage = pathname === '/';
  const isPublicPage = isAuthPage || isHomePage;

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 dark:bg-gray-900" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
              const theme = settings.profile?.theme || 'system';
              const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
              if (isDark) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (e) {
              if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
              }
            }
          `
        }} />
        <ThemeProvider>
          {isPublicPage ? (
            // Public page layout - no navigation (home and auth pages)
            <div className="min-h-screen">
              {children}
            </div>
          ) : (
            // Main app layout - with full navigation
            <div className="flex flex-col h-screen">
              {/* Header - occupies entire top width */}
              <Header onMenuToggle={toggleMobileSidebar} />
              
              {/* Main Content Area with Sidebar */}
              <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar - smart toggle */}
                <div className="hidden lg:block">
                  <ConditionalSidebar 
                    isCollapsed={isSidebarCollapsed} 
                    onToggle={toggleSidebar}
                  />
                </div>
                
                {/* Mobile Sidebar Overlay */}
                {isMobileSidebarOpen && (
                  <div className="fixed inset-0 z-50 lg:hidden">
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 bg-gray-900/20 dark:bg-black/50 backdrop-blur-sm transition-opacity duration-300 opacity-100"
                      onClick={() => setIsMobileSidebarOpen(false)}
                    />
                    
                    {/* Mobile Sidebar */}
                    <div className="fixed left-0 top-0 h-full w-64 z-50 transform translate-x-0 transition-all duration-300 ease-out shadow-2xl animate-in slide-in-from-left"
                         style={{ animationDuration: '300ms' }}>
                      <div className="h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                        {/* Mobile Header */}
                        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-sm">S</span>
                            </div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                              Scrumix
                            </span>
                          </div>
                        </div>
                        
                        {/* Sidebar Content */}
                        <div className="flex-1 min-h-0">
                          <ConditionalSidebar 
                            isCollapsed={false} 
                            onToggle={() => setIsMobileSidebarOpen(false)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {children}
                  </div>
                </main>
              </div>
              
              {/* Footer */}
              <Footer />
            </div>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
