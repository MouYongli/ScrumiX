'use client';

import { useState } from "react";
import { usePathname } from "next/navigation";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ConditionalSidebar from "@/components/layout/ConditionalSidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
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

  return (
    <html lang="en">
      <body className="bg-gray-50 dark:bg-gray-900">
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
                  <div 
                    className="fixed inset-0 bg-black bg-opacity-50"
                    onClick={() => setIsMobileSidebarOpen(false)}
                  />
                  <div className="fixed left-0 top-0 h-full w-64 z-50 pt-16">
                    <ConditionalSidebar 
                      isCollapsed={false} 
                      onToggle={() => setIsMobileSidebarOpen(false)}
                    />
                  </div>
                </div>
              )}
              
              {/* Main Content */}
              <main className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  {children}
                </div>
              </main>
            </div>
            
            {/* Footer */}
            <Footer />
          </div>
        )}
      </body>
    </html>
  );
}
