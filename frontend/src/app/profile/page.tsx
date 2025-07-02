'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Camera, Save, Lock, Eye, EyeOff, Edit2, CheckCircle2, Shield } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { useAuth } from '@/components/auth/AuthGuard';
import { getCurrentUser, getAuthProvider } from '@/utils/auth';

const ProfilePage = () => {
  const { user: authUser, isAuthenticated } = useAuth();
  const [userInfo, setUserInfo] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    location: '',
    bio: '',
    joinDate: '',
    avatar: null as string | null,
    provider: '',
    is_keycloak_user: false,
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

  // Load user information
  useEffect(() => {
    const loadUserData = () => {
      const currentUser = getCurrentUser();
      const authProvider = getAuthProvider();
      const isKeycloakUser = authProvider === 'keycloak';
      
      if (currentUser) {
        setUserInfo({
          id: currentUser.id || '1',
          name: currentUser.full_name || currentUser.username || currentUser.email.split('@')[0],
          email: currentUser.email || '',
          phone: (currentUser as any).phone || '',
          department: (currentUser as any).department || 'Product Development',
          position: (currentUser as any).position || 'Scrum Master',
          location: (currentUser as any).location || 'Remote',
          bio: (currentUser as any).bio || `${isKeycloakUser ? 'Authenticated via Keycloak SSO. ' : ''}Passionate about agile development, dedicated to improving team collaboration efficiency.`,
          joinDate: (currentUser as any).joinDate || new Date().toISOString().split('T')[0],
          avatar: currentUser.avatar_url || null,
          provider: currentUser.provider || 'local',
          is_keycloak_user: isKeycloakUser,
        });
      } else {
        // Fallback for unauthenticated users
        setUserInfo({
          id: '1',
          name: 'Guest User',
          email: 'guest@example.com',
          phone: '',
          department: 'Product Development',
          position: 'Scrum Master',
          location: 'Remote',
          bio: 'Passionate about agile development, dedicated to improving team collaboration efficiency.',
          joinDate: '2023-01-15',
          avatar: null,
          provider: 'local',
          is_keycloak_user: false,
        });
      }
    };

    loadUserData();
  }, [authUser, isAuthenticated]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    if (!userInfo.name.trim()) {
      newErrors.name = 'Please enter your name';
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
      // Mock save API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update user information in localStorage with proper field mapping
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = {
        ...currentUser,
        // Map profile fields to User interface fields
        full_name: userInfo.name,
        email: userInfo.email,
        avatar_url: userInfo.avatar,
        username: userInfo.name.toLowerCase().replace(/\s+/g, ''), // Generate username from name
        // Keep additional profile fields as extended properties
        phone: userInfo.phone,
        department: userInfo.department,
        position: userInfo.position,
        location: userInfo.location,
        bio: userInfo.bio,
        joinDate: userInfo.joinDate,
        provider: userInfo.provider,
        is_verified: currentUser.is_verified || true
      };
      
      // Update localStorage - this will trigger the storage change listener in useAuth()
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Trigger a storage event manually for same-tab updates
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'user',
        newValue: JSON.stringify(updatedUser),
        oldValue: JSON.stringify(currentUser)
      }));
      
      setIsEditing(false);
      
      // Show success message
      setSuccessMessage('Profile updated successfully! Changes will appear in the header.');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      setErrors({ submit: 'Save failed, please try again later' });
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
      // Mock password change API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      // Success message can be added here
    } catch (error) {
      setErrors({ submit: 'Password change failed, please try again later' });
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
          {userInfo.name.charAt(0).toUpperCase()}
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4">
                {userInfo.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">{userInfo.position}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{userInfo.department}</p>
              
              {/* Keycloak authentication indicator */}
              {userInfo.is_keycloak_user && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                  <Shield className="w-4 h-4" />
                  <span>Keycloak SSO</span>
                </div>
              )}
            </div>

            {/* Quick info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">{userInfo.email}</span>
              </div>
              {userInfo.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{userInfo.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">{userInfo.location}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  Joined on {new Date(userInfo.joinDate).toLocaleDateString('en-US')}
                </span>
              </div>
              
              {/* Authentication provider info */}
              <div className="flex items-center gap-3 text-sm">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  {userInfo.is_keycloak_user ? 'Keycloak SSO Authentication' : 'Local Authentication'}
                </span>
                {userInfo.is_keycloak_user && (
                  <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full text-xs">
                    Verified
                  </span>
                )}
              </div>
            </div>
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
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={userInfo.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                    !isEditing ? 'bg-gray-50 dark:bg-gray-600' : ''
                  } ${errors.name ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
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

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  name="position"
                  value={userInfo.position}
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
                  onClick={() => {
                    setIsEditing(false);
                    setErrors({});
                    setSuccessMessage('');
                    // Re-load original data
                    const userData = localStorage.getItem('user');
                    if (userData) {
                      const user = JSON.parse(userData);
                      setUserInfo(prev => ({ 
                        ...prev, 
                        name: user.full_name || user.username || user.email?.split('@')[0] || prev.name,
                        email: user.email || prev.email,
                        avatar: user.avatar_url || prev.avatar,
                        phone: user.phone || prev.phone,
                        department: user.department || prev.department,
                        position: user.position || prev.position,
                        location: user.location || prev.location,
                        bio: user.bio || prev.bio,
                        provider: user.provider || prev.provider
                      }));
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