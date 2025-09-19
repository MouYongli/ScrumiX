'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Camera, Save, Lock, Eye, EyeOff, Edit2, CheckCircle2, Shield } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { useAuth } from '@/components/auth/AuthGuard';
import { getCurrentUser, getAuthProvider } from '@/utils/auth';
import { api } from '@/utils/api';

const ProfilePage = () => {
  const { user: authUser, isAuthenticated } = useAuth();
  const [userInfo, setUserInfo] = useState({
    id: '',
    firstName: '',
    lastName: '',
    name: '', // Keep for backward compatibility
    email: '',
    phone: '',
    department: '',
    location: '',
    bio: '',
    joinDate: '',
    avatar: null as string | null,
    provider: '',
    is_keycloak_user: false,
    dateFormat: 'YYYY-MM-DD',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Load user information from backend
  const loadUserData = async () => {
    try {
              const response = await api.users.getProfile();
        
        if (response.data) {
          const user = response.data;
        const authProvider = getAuthProvider();
        const isKeycloakUser = authProvider === 'keycloak';
        
        const newUserInfo = {
          id: String(user.id) || '1',
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          name: user.full_name || user.username || user.email.split('@')[0],
          email: user.email || '',
          phone: user.phone || '',
          department: user.department || '',
          location: user.location || '',
          bio: user.bio || '',
          joinDate: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          avatar: user.avatar_url || null,
          provider: user.provider || 'local',
          is_keycloak_user: isKeycloakUser,
          dateFormat: user.date_format || 'YYYY-MM-DD',
        };
        
        setUserInfo(newUserInfo);
        
        // Also update localStorage with the fresh backend data to keep it in sync
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = {
          ...currentUser,
          full_name: user.full_name || currentUser.full_name,
          phone: user.phone || currentUser.phone,
          department: user.department || currentUser.department,
          location: user.location || currentUser.location,
          bio: user.bio || currentUser.bio,
          avatar_url: user.avatar_url || currentUser.avatar_url,
          provider: user.provider || currentUser.provider,
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        console.warn('No data received from backend, falling back to localStorage');
        // Only fallback to localStorage if backend fails completely
        const currentUser = getCurrentUser();
        if (currentUser) {
          const authProvider = getAuthProvider();
          const isKeycloakUser = authProvider === 'keycloak';
          
          const fallbackUserInfo = {
            id: String(currentUser.id) || '1',
            firstName: (currentUser as any).first_name || '',
            lastName: (currentUser as any).last_name || '',
            name: currentUser.full_name || currentUser.username || currentUser.email.split('@')[0],
            email: currentUser.email || '',
            phone: (currentUser as any).phone || '',
            department: (currentUser as any).department || '',
            location: (currentUser as any).location || '',
            bio: (currentUser as any).bio || '',
            joinDate: (currentUser as any).joinDate || new Date().toISOString().split('T')[0],
            avatar: currentUser.avatar_url || null,
            provider: currentUser.provider || 'local',
            is_keycloak_user: isKeycloakUser,
            dateFormat: (currentUser as any).date_format || 'YYYY-MM-DD',
          };
          
                  setUserInfo(fallbackUserInfo);
        }
      }
    } catch (error) {
      console.error('Failed to load user profile from backend:', error);
      console.log('Falling back to localStorage data...');
      
      // Only use localStorage as absolute last resort
      const currentUser = getCurrentUser();
      if (currentUser) {
        const authProvider = getAuthProvider();
        const isKeycloakUser = authProvider === 'keycloak';
        
        const fallbackUserInfo = {
          id: String(currentUser.id) || '1',
          firstName: (currentUser as any).first_name || '',
          lastName: (currentUser as any).last_name || '',
          name: currentUser.full_name || currentUser.username || currentUser.email.split('@')[0],
          email: currentUser.email || '',
          phone: (currentUser as any).phone || '',
          department: (currentUser as any).department || '',
          location: (currentUser as any).location || '',
          bio: (currentUser as any).bio || '',
          joinDate: (currentUser as any).joinDate || new Date().toISOString().split('T')[0],
          avatar: currentUser.avatar_url || null,
          provider: currentUser.provider || 'local',
          is_keycloak_user: isKeycloakUser,
          dateFormat: (currentUser as any).date_format || 'YYYY-MM-DD',
        };
        
        setUserInfo(fallbackUserInfo);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [authUser, isAuthenticated]);



  // Periodically refresh profile data to keep localStorage in sync
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const refreshInterval = setInterval(async () => {
      try {
        const response = await api.users.getProfile();
        if (response.data) {
          const user = response.data;
          // Only update localStorage if we have new data
          const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
          if (user.department !== currentUser.department || 
              user.phone !== currentUser.phone || 
              user.location !== currentUser.location || 
              user.bio !== currentUser.bio) {
            
            const updatedUser = {
              ...currentUser,
              full_name: user.full_name || currentUser.full_name,
              phone: user.phone || currentUser.phone,
              department: user.department || currentUser.department,
              location: user.location || currentUser.location,
              bio: user.bio || currentUser.bio,
              avatar_url: user.avatar_url || currentUser.avatar_url,
              provider: user.provider || currentUser.provider,
            };
            
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        }
      } catch (error) {
        console.error('Periodic profile refresh failed:', error);
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, [isAuthenticated]);

        // Force refresh profile data when user navigates to profile page
      useEffect(() => {
        if (isAuthenticated && authUser) {
          // Small delay to ensure the component is fully mounted
          const timer = setTimeout(() => {
            loadUserData();
          }, 100);
          return () => clearTimeout(timer);
        }
      }, [authUser]);

  // Reload profile data when user returns to the tab (e.g., after page refresh)
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated) {
        loadUserData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated]);

  // Reload profile data when user navigates back to the profile page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        loadUserData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserInfo(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error and success messages
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error messages
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validateProfile = () => {
    const newErrors: { [key: string]: string } = {};

    if (!userInfo.firstName.trim()) {
      newErrors.firstName = 'Please enter your first name';
    }

    if (!userInfo.lastName.trim()) {
      newErrors.lastName = 'Please enter your last name';
    }

    if (!userInfo.email) {
      newErrors.email = 'Please enter your email address';
    } else if (!/\S+@\S+\.\S+/.test(userInfo.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors: { [key: string]: string } = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Please enter your current password';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'Please enter your new password';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'The passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Prepare profile data for backend
      const profileData = {
        first_name: userInfo.firstName,
        last_name: userInfo.lastName,
        phone: userInfo.phone,
        department: userInfo.department,
        location: userInfo.location,
        bio: userInfo.bio,
        avatar_url: userInfo.avatar,
        date_format: userInfo.dateFormat,
      };
      
      // Debug: Log what we're about to send
      console.log('About to send profile data:', profileData);
      console.log('userInfo.department value:', userInfo.department);
      console.log('userInfo.department type:', typeof userInfo.department);

      const response = await api.users.updateProfile(profileData);
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Debug: Log the response to see what we're getting
      console.log('Profile update response:', response);
      console.log('Profile data sent:', profileData);
      console.log('Current userInfo before update:', userInfo);

      // Update userInfo state with the response data from backend
      if (response.data) {
        const updatedData = response.data;
        const authProvider = getAuthProvider();
        const isKeycloakUser = authProvider === 'keycloak';
        
        const newUserInfo = {
          id: String(updatedData.id) || userInfo.id,
          firstName: updatedData.first_name !== undefined ? updatedData.first_name : userInfo.firstName,
          lastName: updatedData.last_name !== undefined ? updatedData.last_name : userInfo.lastName,
          name: updatedData.full_name || userInfo.name,
          email: updatedData.email || userInfo.email,
          phone: updatedData.phone !== undefined ? updatedData.phone : userInfo.phone,
          department: updatedData.department !== undefined ? updatedData.department : userInfo.department,
          location: updatedData.location !== undefined ? updatedData.location : userInfo.location,
          bio: updatedData.bio !== undefined ? updatedData.bio : userInfo.bio,
          joinDate: updatedData.created_at ? new Date(updatedData.created_at).toISOString().split('T')[0] : userInfo.joinDate,
          avatar: updatedData.avatar_url !== undefined ? updatedData.avatar_url : userInfo.avatar,
          provider: updatedData.provider || 'local',
          is_keycloak_user: isKeycloakUser,
          dateFormat: updatedData.date_format !== undefined ? updatedData.date_format : userInfo.dateFormat,
        };
        
        console.log('New userInfo to be set:', newUserInfo);
        setUserInfo(newUserInfo);
        console.log('setUserInfo called with:', newUserInfo);
      }

      // Update localStorage with fresh data from backend for immediate header update
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const backendData = response.data || {};
      const updatedUser = {
        ...currentUser,
        full_name: backendData.full_name !== undefined ? backendData.full_name : userInfo.name,
        avatar_url: backendData.avatar_url !== undefined ? backendData.avatar_url : userInfo.avatar,
        phone: backendData.phone !== undefined ? backendData.phone : userInfo.phone,
        department: backendData.department !== undefined ? backendData.department : userInfo.department,
        location: backendData.location !== undefined ? backendData.location : userInfo.location,
        bio: backendData.bio !== undefined ? backendData.bio : userInfo.bio,
        provider: backendData.provider || userInfo.provider,
        is_verified: currentUser.is_verified || true
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Trigger storage event for header update
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'user',
        newValue: JSON.stringify(updatedUser),
        oldValue: JSON.stringify(currentUser)
      }));
      
      // Force reload profile data from backend to ensure consistency
      try {
        const refreshResponse = await api.users.getProfile();
        if (refreshResponse.data) {
          const refreshedUser = refreshResponse.data;
          const authProvider = getAuthProvider();
          const isKeycloakUser = authProvider === 'keycloak';
          
          const refreshedUserInfo = {
            id: String(refreshedUser.id) || '1',
            firstName: refreshedUser.first_name || '',
            lastName: refreshedUser.last_name || '',
            name: refreshedUser.full_name || refreshedUser.username || refreshedUser.email.split('@')[0],
            email: refreshedUser.email || '',
            phone: refreshedUser.phone || '',
            department: refreshedUser.department || '',
            location: refreshedUser.location || '',
            bio: refreshedUser.bio || '',
            joinDate: refreshedUser.created_at ? new Date(refreshedUser.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            avatar: refreshedUser.avatar_url || null,
            provider: refreshedUser.provider || 'local',
            is_keycloak_user: isKeycloakUser,
            dateFormat: refreshedUser.date_format || 'YYYY-MM-DD',
          };
          
          setUserInfo(refreshedUserInfo);
        }
      } catch (refreshError) {
        console.error('Failed to refresh profile data after update:', refreshError);
      }
      
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully! Changes have been saved to the database.');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Save failed, please try again later' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await api.users.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setSuccessMessage('Password changed successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Password change failed, please try again later' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newAvatar = event.target?.result as string;
        
        // Update local state
        setUserInfo(prev => ({
          ...prev,
          avatar: newAvatar,
        }));
        
        // Immediately update the global user context for instant feedback
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = {
          ...currentUser,
          avatar_url: newAvatar
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Trigger storage event for immediate header update
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'user',
          newValue: JSON.stringify(updatedUser),
          oldValue: JSON.stringify(currentUser)
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const renderAvatar = () => {
    if (userInfo.avatar) {
      return (
        <img
          src={userInfo.avatar}
          alt="User Avatar"
          className="w-24 h-24 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
        <span className="text-white font-bold text-2xl">
          {(userInfo.firstName || userInfo.name).charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Personal Information', icon: <User className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Personal Information
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your personal information and account settings
          </p>
        </div>
        
        {!isEditing && !isChangingPassword && (
          <div className="flex gap-3">
            {!userInfo.is_keycloak_user && (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Lock className="w-4 h-4" />
                Change Password
              </button>
            )}
            <button
              onClick={() => {
                setIsEditing(true);
                setErrors({});
                setSuccessMessage('');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Edit Information
            </button>
            
            {/* Info about Keycloak password management */}
            {userInfo.is_keycloak_user && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
                <Shield className="w-4 h-4" />
                <span>Password managed by Keycloak SSO</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left side: Avatar and basic information */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {/* Avatar */}
            <div className="text-center mb-6">
              <div className="relative inline-block">
                {renderAvatar()}
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              
              {/* Authentication type badge - positioned prominently */}
              <div className="mt-3 mb-2">
                {userInfo.is_keycloak_user ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-sm font-medium shadow-sm">
                  <Shield className="w-4 h-4" />
                  <span>Keycloak SSO</span>
                    <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-full text-sm font-medium shadow-sm">
                    <Shield className="w-4 h-4" />
                    <span>Local Account</span>
                </div>
              )}
            </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-2">
                {userInfo.firstName && userInfo.lastName 
                  ? `${userInfo.firstName} ${userInfo.lastName}` 
                  : userInfo.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{userInfo.email}</p>
              </div>
              
            {/* Remove the old authentication info section since it's now integrated above */}
          </div>
        </div>

        {/* Right side: Detailed information */}
        <div className="lg:col-span-2">
          {/* Password change form */}
          {isChangingPassword && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Change Password
              </h2>
              
              <div className="space-y-4">
                {/* Current password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                        errors.currentPassword ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.currentPassword}</p>
                  )}
                </div>

                {/* New password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                        errors.newPassword ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.newPassword}</p>
                  )}
                </div>

                {/* Confirm new password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                        errors.confirmPassword ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Enter new password again"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleChangePassword}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                      setErrors({});
                    }}
                    className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Personal information form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Personal Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={userInfo.firstName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                    !isEditing ? 'bg-gray-50 dark:bg-gray-600' : ''
                  } ${errors.firstName ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={userInfo.lastName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                    !isEditing ? 'bg-gray-50 dark:bg-gray-600' : ''
                  } ${errors.lastName ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                  {userInfo.is_keycloak_user && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Managed by Keycloak)</span>
                  )}
                </label>
                <input
                  type="email"
                  name="email"
                  value={userInfo.email}
                  onChange={handleInputChange}
                  disabled={!isEditing || userInfo.is_keycloak_user}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                    !isEditing || userInfo.is_keycloak_user ? 'bg-gray-50 dark:bg-gray-600' : ''
                  } ${errors.email ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={userInfo.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                    !isEditing ? 'bg-gray-50 dark:bg-gray-600' : ''
                  } border-gray-300 dark:border-gray-600`}
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={userInfo.department}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                    !isEditing ? 'bg-gray-50 dark:bg-gray-600' : ''
                  } border-gray-300 dark:border-gray-600`}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={userInfo.location}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                    !isEditing ? 'bg-gray-50 dark:bg-gray-600' : ''
                  } border-gray-300 dark:border-gray-600`}
                />
              </div>

              {/* Date Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Format
                </label>
                <select
                  name="dateFormat"
                  value={userInfo.dateFormat}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                    !isEditing ? 'bg-gray-50 dark:bg-gray-600' : ''
                  } border-gray-300 dark:border-gray-600`}
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                  <option value="DD-MM-YYYY">DD-MM-YYYY (31-12-2024)</option>
                  <option value="MMM DD, YYYY">MMM DD, YYYY (Dec 31, 2024)</option>
                  <option value="DD MMM YYYY">DD MMM YYYY (31 Dec 2024)</option>
                </select>
              </div>
            </div>

            {/* Bio */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bio
              </label>
              <textarea
                name="bio"
                value={userInfo.bio}
                onChange={handleInputChange}
                disabled={!isEditing}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                  !isEditing ? 'bg-gray-50 dark:bg-gray-600' : ''
                } border-gray-300 dark:border-gray-600`}
              />
            </div>

            {/* Edit mode buttons */}
            {isEditing && (
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
                <button
                  onClick={async () => {
                    setIsEditing(false);
                    setErrors({});
                    setSuccessMessage('');
                    // Re-load original data from backend
                    try {
                      const response = await api.users.getProfile();
                      if (response.data) {
                        const user = response.data;
                        const authProvider = getAuthProvider();
                        const isKeycloakUser = authProvider === 'keycloak';
                        
                        setUserInfo({
                          id: String(user.id) || '1',
                          firstName: user.first_name || '',
                          lastName: user.last_name || '',
                          name: user.full_name || user.username || user.email.split('@')[0],
                          email: user.email || '',
                          phone: user.phone || '',
                          department: user.department || '',
                          location: user.location || '',
                          bio: user.bio || '',
                          joinDate: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                          avatar: user.avatar_url || null,
                          provider: user.provider || 'local',
                          is_keycloak_user: isKeycloakUser,
                          dateFormat: user.date_format || 'YYYY-MM-DD',
                        });
                      }
                    } catch (error) {
                      console.error('Failed to reload profile data:', error);
                    }
                  }}
                  className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Success message */}
            {successMessage && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
              </div>
            )}

            {/* Error messages */}
            {errors.submit && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 