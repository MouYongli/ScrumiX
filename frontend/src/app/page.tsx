'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, User, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { isAuthenticated } from '@/utils/auth';

export default function Home() {
  const router = useRouter();
  const { theme, setTheme, effectiveTheme } = useTheme();

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

  // Handle login click
  const handleLoginClick = async () => {
    try {
      const isLoggedIn = await isAuthenticated();
      if (isLoggedIn) {
        // User is already logged in, redirect to workspace
        router.push('/workspace');
      } else {
        // User is not logged in, go to login page
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // If auth check fails, proceed to login page
      router.push('/auth/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Header - consistent with post-login interface */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Logo */}
            <div className="flex items-center">
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

            {/* Right: Theme toggle, login and signup buttons */}
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

              {/* Notification icon placeholder */}
              <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 relative">
                <Bell className="h-5 w-5" />
              </button>

              {/* Login and signup buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleLoginClick}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 text-sm font-medium transition-colors"
                >
                  Login
                </button>
                <Link
                  href="/auth/signup"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with flex-grow to push footer to bottom */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            AI-Powered
            <span className="text-blue-600 dark:text-blue-400"> ScrumiX</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
            Transform your Scrum management with intelligent AI agents that automate workflows, generate insights, and enhance team productivity
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleLoginClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Experience AI-Powered Scrum
            </button>
          </div>
        </div>

        {/* AI Agents Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Meet Your AI Scrum Assistants
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Three specialized AI agents working together to revolutionize your agile workflow
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Product Owner AI Agent */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-bl-full"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    {/* Robot Head */}
                    <rect x="8" y="3" width="8" height="6" rx="2" />
                    {/* Robot Eyes */}
                    <circle cx="10.5" cy="5.5" r="0.8" fill="#dbeafe" />
                    <circle cx="13.5" cy="5.5" r="0.8" fill="#dbeafe" />
                    {/* Robot Body */}
                    <rect x="6" y="9" width="12" height="9" rx="2" />
                    {/* Arms */}
                    <rect x="4" y="11" width="2" height="5" rx="1" />
                    <rect x="18" y="11" width="2" height="5" rx="1" />
                    {/* Legs */}
                    <rect x="8.5" y="18" width="2" height="3" rx="1" />
                    <rect x="13.5" y="18" width="2" height="3" rx="1" />
                    {/* Chest Panel */}
                    <rect x="9" y="12" width="6" height="3" rx="1" fill="#dbeafe" opacity="0.3" />
                    {/* Antenna */}
                    <circle cx="12" cy="2" r="0.8" />
                    <line x1="12" y1="3" x2="12" y2="2.2" stroke="#dbeafe" strokeWidth="0.8" />
                    {/* Document symbol on chest */}
                    <rect x="10.5" y="13" width="3" height="1.5" rx="0.2" fill="#1d4ed8" opacity="0.6" />
                    <line x1="11" y1="13.8" x2="13" y2="13.8" stroke="#1d4ed8" strokeWidth="0.3" />
                  </svg>
                </div>
                <div className="mb-4">
                  <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                    Product Owner AI
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Backlog Management & Prioritization
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  Automatically prioritizes product backlog items, analyzes user stories for completeness, and provides data-driven recommendations for feature development based on business value.
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrum Master AI Agent */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-bl-full"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    {/* Robot Head */}
                    <rect x="8" y="3" width="8" height="6" rx="2" />
                    {/* Robot Eyes */}
                    <circle cx="10.5" cy="5.5" r="0.8" fill="#dcfce7" />
                    <circle cx="13.5" cy="5.5" r="0.8" fill="#dcfce7" />
                    {/* Robot Body */}
                    <rect x="6" y="9" width="12" height="9" rx="2" />
                    {/* Arms */}
                    <rect x="4" y="11" width="2" height="5" rx="1" />
                    <rect x="18" y="11" width="2" height="5" rx="1" />
                    {/* Legs */}
                    <rect x="8.5" y="18" width="2" height="3" rx="1" />
                    <rect x="13.5" y="18" width="2" height="3" rx="1" />
                    {/* Chest Panel */}
                    <rect x="9" y="12" width="6" height="3" rx="1" fill="#dcfce7" opacity="0.3" />
                    {/* Antenna */}
                    <circle cx="12" cy="2" r="0.8" />
                    <line x1="12" y1="3" x2="12" y2="2.2" stroke="#dcfce7" strokeWidth="0.8" />
                    {/* Team/coaching symbol on chest */}
                    <circle cx="11" cy="13.2" r="0.4" fill="#059669" opacity="0.7" />
                    <circle cx="13" cy="13.2" r="0.4" fill="#059669" opacity="0.7" />
                    <circle cx="12" cy="14.3" r="0.4" fill="#059669" opacity="0.7" />
                    {/* Communication waves */}
                    <path d="M10 2.5 Q12 1.8 14 2.5" stroke="#dcfce7" strokeWidth="0.4" fill="none" />
                  </svg>
                </div>
                <div className="mb-4">
                  <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                    Scrum Master AI
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Process Facilitation & Team Coaching
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  Facilitates Scrum ceremonies, identifies process bottlenecks, generates meeting summaries, and provides coaching insights to improve team velocity and collaboration.
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Developer AI Agent */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-bl-full"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    {/* Robot Head */}
                    <rect x="8" y="3" width="8" height="6" rx="2" />
                    {/* Robot Eyes */}
                    <circle cx="10.5" cy="5.5" r="0.8" fill="#f3e8ff" />
                    <circle cx="13.5" cy="5.5" r="0.8" fill="#f3e8ff" />
                    {/* Robot Body */}
                    <rect x="6" y="9" width="12" height="9" rx="2" />
                    {/* Arms */}
                    <rect x="4" y="11" width="2" height="5" rx="1" />
                    <rect x="18" y="11" width="2" height="5" rx="1" />
                    {/* Legs */}
                    <rect x="8.5" y="18" width="2" height="3" rx="1" />
                    <rect x="13.5" y="18" width="2" height="3" rx="1" />
                    {/* Chest Panel */}
                    <rect x="9" y="12" width="6" height="3" rx="1" fill="#f3e8ff" opacity="0.3" />
                    {/* Antenna */}
                    <circle cx="12" cy="2" r="0.8" />
                    <line x1="12" y1="3" x2="12" y2="2.2" stroke="#f3e8ff" strokeWidth="0.8" />
                    {/* Code symbols on chest */}
                    <text x="10.2" y="14" fontSize="1.8" fill="#7c3aed" opacity="0.8">&lt;</text>
                    <text x="12" y="14" fontSize="1.5" fill="#7c3aed" opacity="0.8">/</text>
                    <text x="13.2" y="14" fontSize="1.8" fill="#7c3aed" opacity="0.8">&gt;</text>
                    {/* Data streams from antenna */}
                    <path d="M10.5 2 L12 1.5 L13.5 2" stroke="#f3e8ff" strokeWidth="0.4" fill="none" />
                    <path d="M10.8 2.2 L12 1.8 L13.2 2.2" stroke="#f3e8ff" strokeWidth="0.3" fill="none" />
                  </svg>
                </div>
                <div className="mb-4">
                  <span className="inline-block bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                    Developer AI
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Code Review & Task Estimation
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  Assists with task breakdown, provides accurate effort estimates, suggests technical solutions, and performs automated code quality assessments for better delivery.
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Comprehensive Scrum Management
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Everything you need for successful agile project delivery
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-blue-100 dark:bg-blue-900/20 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Smart Sprint Planning
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                AI-powered sprint planning with automatic story point estimation and capacity prediction for optimal team performance.
              </p>
            </div>
            
            <div className="text-center bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-green-100 dark:bg-green-900/20 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Intelligent Collaboration
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                AI-enhanced team collaboration with automated meeting summaries, action item tracking, and progress insights.
              </p>
            </div>
            
            <div className="text-center bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-purple-100 dark:bg-purple-900/20 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Predictive Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Advanced data analysis with predictive insights for continuous improvement and optimized development processes.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 relative">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-2xl p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-black/10 rounded-2xl"></div>
            <div className="absolute top-4 right-4 w-24 h-24 bg-white/10 rounded-full"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/5 rounded-full"></div>
            <div className="relative text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Transform Your Scrum Process?
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Join teams worldwide who are already experiencing the power of AI-driven agile management
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={handleLoginClick}
                  className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                >
                  Start Free with AI Agents
                </button>
              </div>
              <div className="mt-8 flex items-center justify-center space-x-8 text-blue-200">
                <div className="flex items-center space-x-2">
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>
      
      {/* Footer - consistent with post-login interface */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              {/* Brand info */}
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  ScrumiX
                </span>
              </div>

              {/* Links */}
              <div className="flex items-center space-x-6 text-sm">
                <Link href="/help" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Help Center
                </Link>
                <Link href="/docs" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Documentation
                </Link>
                <Link href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Terms of Service
                </Link>
              </div>

              {/* Copyright */}
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-4 md:mt-0">
                © {new Date().getFullYear()} ScrumiX. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
