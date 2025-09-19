'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Target, Calendar, Users, FileText, 
  CheckSquare, TrendingUp, BarChart3, Settings, 
  MessageSquare, Clock, GitBranch, Zap,
  Menu,
  FolderOpen,
  Users2,
  TrendingDown,
  BarChart
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const pathname = usePathname();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Project Management',
      href: '/project',
      icon: FolderOpen,
    },
    {
      name: 'Sprint Management',
      href: '/sprint',
      icon: Clock,
    },
    {
      name: 'Meeting Management',
      href: '/meeting',
      icon: Users,
    },
    {
      name: 'Team Management',
      href: '/team',
      icon: Users2,
    },
    {
      name: 'User Stories',
      href: '/stories',
      icon: FileText,
    },
    {
      name: 'Task Management',
      href: '/tasks',
      icon: CheckSquare,
    },
    {
      name: 'Burndown Chart',
      href: '/burndown',
      icon: TrendingDown,
    },
    {
      name: 'Reports & Analytics',
      href: '/reports',
      icon: BarChart,
    },
    {
      name: 'Team Collaboration',
      href: '/collaboration',
      icon: MessageSquare,
    },
    {
      name: 'Time Tracking',
      href: '/timetrack',
      icon: Clock,
    },
    {
      name: 'Version Control',
      href: '/versions',
      icon: GitBranch,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } flex flex-col h-full`}>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              导航菜单
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
        <div className="space-y-1">
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

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          ScrumiX v1.0
        </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar; 