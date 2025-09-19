'use client';

import React from 'react';
import { LogOut, AlertCircle, X } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  userName 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 px-6 py-8 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Logout Icon */}
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <LogOut className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Ready to go?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            {userName ? `See you later, ${userName}!` : 'Thanks for using ScrumiX!'}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="flex items-start space-x-3 mb-6">
            <div className="flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            </div>
            <div>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                You'll be signed out of your account and redirected to the login page. 
                Any unsaved changes will be lost.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-500"
            >
              Stay Logged In
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-red-500 shadow-lg hover:shadow-red-200 dark:hover:shadow-red-900/50"
            >
              <div className="flex items-center justify-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            💡 <strong>Tip:</strong> You can quickly logout using Ctrl+Alt+L
          </p>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
