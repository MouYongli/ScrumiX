'use client';

import { useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ConditionalSidebar from "@/components/layout/ConditionalSidebar";
import ChatWidget from "@/components/chat/ChatWidget";
import GuideAgent from "@/components/chat/GuideAgent";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Script to apply theme before React hydrates to prevent flash
const themeScript = `
  (function() {
    try {
      // Function to apply theme to document
      function applyTheme(theme) {
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'light') {
          root.classList.remove('dark');
        } else {
          // System theme
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (isDark) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
      }

      // Load theme from localStorage
      let savedTheme = null;
      
      // First try userSettings
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.profile?.theme) {
          savedTheme = settings.profile.theme;
        }
      }
      
      // Fallback to direct theme storage
      if (!savedTheme) {
        savedTheme = localStorage.getItem('theme');
      }
      
      // Apply theme or default to system
      applyTheme(savedTheme || 'system');
    } catch (e) {
      // If anything fails, default to light mode
      document.documentElement.classList.remove('dark');
    }
  })();
`;

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
  
  // Check if it's a project-specific page (under /project/[project-id]/)
  const isProjectPage = pathname?.startsWith('/project/') && pathname?.split('/').length >= 3;
  
  // Check if it's a global page that should show the Guide Agent
  const isGlobalPage = !isAuthPage && !isHomePage && !isProjectPage;

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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          {isPublicPage ? (
            // Public page layout - no navigation (home and auth pages)
            <div className="min-h-screen">
              {children}
            </div>
          ) : (
            // Main app layout - with full navigation
            <div className="flex flex-col min-h-screen">
              {/* Header - occupies entire top width */}
              <Header onMenuToggle={toggleMobileSidebar} />

              {/* Desktop Sidebar - Fixed positioning */}
              <div className="hidden lg:block">
                <div className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ${
                  isSidebarCollapsed ? 'w-16' : 'w-64'
                }`} style={{ top: '64px' }}>
                  <ConditionalSidebar
                    isCollapsed={isSidebarCollapsed}
                    onToggle={toggleSidebar}
                  />
                </div>
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
                  <div className="fixed left-0 top-0 h-full w-64 z-50 transform translate-x-0 transition-all duration-300 ease-out shadow-2xl animate-in slide-in-from-left mt-16"
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
              
              {/* Main Content with margin for fixed sidebar */}
              <main className={`bg-gray-50 dark:bg-gray-900 transition-all duration-300 flex-1 ${
                isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
              }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  {children}
                </div>
              </main>

              {/* Footer */}
              <Footer />
            </div>
          )}
          
          {/* Chat Widget - Only available on project-specific pages */}
          {isProjectPage && <ChatWidget />}
          
          {/* Guide Agent - Only available on global pages */}
          {isGlobalPage && <GuideAgent />}
        </ThemeProvider>
      </body>
    </html>
  );
}
