import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, FolderOpen, Clock, Star, Users, User, Settings, 
  Menu, Home, TrendingUp, BarChart3, Plus, Bell
} from 'lucide-react';

interface GlobalSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const GlobalSidebar: React.FC<GlobalSidebarProps> = ({ isCollapsed, onToggle }) => {
  const pathname = usePathname();

  const navigationItems = [
    {
      name: 'My Workspace',
      href: '/workspace',
      icon: LayoutDashboard,
    },
    {
      name: 'My Projects',
      href: '/project',
      icon: FolderOpen,
    },
  ];

  const userItems = [
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  const isActive = (path: string) => {
    if (path === '/workspace') {
      return pathname === '/workspace';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64 lg:w-64'
    } flex flex-col h-full`} style={{ height: 'calc(100vh - 64px)' }}>
      
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <Home className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Workspace
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
        >
          <Menu className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* Main navigation */}
        <div className="space-y-1 mb-6">
          {!isCollapsed && (
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Main Features
              </h3>
            </div>
          )}
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <IconComponent className={`w-5 h-5 flex-shrink-0 ${
                  active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                }`} />
                {!isCollapsed && (
                  <span className="font-medium truncate">{item.name}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-2">
        {!isCollapsed && (
          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Personal
            </h3>
          </div>
        )}
        <div className="space-y-1">
          {userItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <IconComponent className={`w-5 h-5 flex-shrink-0 ${
                  active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                }`} />
                {!isCollapsed && (
                  <span className="font-medium truncate">{item.name}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            ScrumiX v1.0 - Global Workspace
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSidebar;