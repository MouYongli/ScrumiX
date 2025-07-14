'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, ChevronDown, User, Settings, HelpCircle, LogOut, Menu, Sun, Moon, Monitor } from 'lucide-react';
import NotificationPopover from '../common/NotificationPopover';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '../auth/AuthGuard';

interface HeaderProps {
  onMenuToggle?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  // Theme management
  const { theme, setTheme, effectiveTheme } = useTheme();
  
  // Authentication management
  const { user, isAuthenticated, logout: authLogout } = useAuth();

  // Mock user data (fallback for unauthenticated users)
  const defaultUser = {
    full_name: "Guest User",
    email: "guest@example.com",
    avatar_url: null
  };

  // Use authenticated user data or default data
  const displayUser = isAuthenticated && user ? {
    name: user.full_name || user.username || user.email.split('@')[0],
    email: user.email,
    avatar: user.avatar_url,
    provider: user.provider
  } : {
    name: defaultUser.full_name,
    email: defaultUser.email, 
    avatar: defaultUser.avatar_url,
    provider: 'local'
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  // Notification popover handlers
  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  const closeNotifications = () => {
    setIsNotificationsOpen(false);
  };

  // Theme toggle functionality
  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      case 'system':
        return Monitor;
      default:
        return effectiveTheme === 'dark' ? Moon : Sun;
    }
  };

  const cycleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // Handle logout
  const handleLogout = () => {
    console.log('User logout');
    if (confirm('Are you sure you want to logout?')) {
      authLogout(); // This will handle clearing all auth data and redirect
    }
  };

  // Click outside to close user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Render user avatar
  const renderUserAvatar = () => {
    if (displayUser.avatar) {
      return (
        <img
          src={displayUser.avatar}
          alt="User Avatar"
          className="w-8 h-8 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
        <span className="text-white font-semibold text-sm">
          {displayUser.name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo and Mobile Menu Toggle (if onMenuToggle is provided) */}
          <div className="flex items-center">
             {/* Mobile menu button - moved to be consistently on the left of the logo */}
            {onMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="p-2 mr-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                ScrumiX
              </span>
            </Link>
          </div>

          {/* Middle: Search box */}
          <div className="flex-1 max-w-lg mx-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search projects, sprints, tasks..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder-gray-500 dark:placeholder-gray-400 text-sm"
              />
            </div>

          </div>

          {/* Right: Theme toggle, notifications and user menu */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={cycleTheme}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={`Current theme: ${theme} (Click to cycle: Light → Dark → System)`}
            >
              {(() => {
                const IconComponent = getThemeIcon();
                return <IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
              })()}
            </button>

            {/* Notification Popover */}
            <NotificationPopover 
              isOpen={isNotificationsOpen} 
              onToggle={toggleNotifications} 
              onClose={closeNotifications} 
            />

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={toggleUserMenu}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {renderUserAvatar()}
                <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {displayUser.name}
                </span>
                {isAuthenticated && displayUser.provider === 'keycloak' && (
                  <span className="hidden lg:block text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-full ml-1">
                    SSO
                  </span>
                )}
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {/* Dropdown menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                      {renderUserAvatar()}
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white font-medium">{displayUser.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{displayUser.email}</p>
                        {isAuthenticated && displayUser.provider === 'keycloak' && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Authenticated via Keycloak
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Link href="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <User className="w-4 h-4 mr-3" />
                    Profile
                  </Link>
                  <Link href="/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Settings className="w-4 h-4 mr-3" />
                    Settings
                  </Link>
                  <Link href="/help" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <HelpCircle className="w-4 h-4 mr-3" />
                    Help Center
                  </Link>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <button 
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
