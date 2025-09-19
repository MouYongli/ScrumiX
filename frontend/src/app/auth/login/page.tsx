'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Github, Shield, Home } from 'lucide-react';

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Check for OAuth errors or success on component mount
  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (error) {
      setErrors({ oauth: decodeURIComponent(error) });
    } else if (message) {
      // Handle success messages (like registration success)
      setErrors({ success: decodeURIComponent(message) });
    } else if (code && state) {
      // Handle OAuth callback
      handleOAuthCallback(code, state);
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error messages
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email) {
      newErrors.email = 'Please enter your email address';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Please enter your password';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Call backend authentication API
      const { login } = await import('../../../utils/auth');
      
      const loginData = await login(
        formData.email, 
        formData.password, 
        formData.rememberMe
      );
      
      console.log('Backend login successful:', loginData.user);
      console.log('Auth method:', loginData.auth_method || 'cookie');
      
      // Redirect to workspace
      router.push('/workspace');
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Login failed, please check your credentials' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    // Simulate third-party login
    console.log(`Login with ${provider}`);
  };

  const handleKeycloakLogin = async () => {
    setIsLoading(true);
    setErrors({});

    try {
      // Import the new cookie-based auth function
      const { getKeycloakAuthUrl } = await import('../../../utils/auth');
      
      // Get authorization URL using the new secure method
      const data = await getKeycloakAuthUrl('login');
      
      // Store state in localStorage for verification (still needed for OAuth flow)
      localStorage.setItem('oauth_state', data.state);
      localStorage.setItem('oauth_origin', 'login');
      
      // Redirect to Keycloak
      window.location.href = data.authorization_url;
    } catch (error) {
      console.error('Keycloak login error:', error);
      setErrors({ oauth: 'Failed to initiate Keycloak login' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    setIsLoading(true);
    
    try {
      // Verify state (extract base state from encoded format)
      const storedState = localStorage.getItem('oauth_state');
      let baseState = state;
      if (state && state.includes(':')) {
        baseState = state.split(':')[0];
      }
      let storedBaseState = storedState;
      if (storedState && storedState.includes(':')) {
        storedBaseState = storedState.split(':')[0];
      }
      if (baseState !== storedBaseState) {
        throw new Error('Invalid state parameter');
      }

      // Import the new cookie-based auth function
      const { loginWithKeycloak } = await import('../../../utils/auth');
      
      // Exchange code for tokens using secure cookie method
      const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/oauth/keycloak/callback`;
      const tokenData = await loginWithKeycloak(code, state, redirectUri);
      
      // Clean up OAuth state and origin
      localStorage.removeItem('oauth_state');
      localStorage.removeItem('oauth_origin');
      
      console.log('Keycloak login successful:', tokenData.user);
      console.log('Auth method:', tokenData.auth_method); // Should show "cookie"
      
      // Redirect to workspace
      router.push('/workspace');
    } catch (error) {
      console.error('OAuth callback error:', error);
      setErrors({ oauth: error instanceof Error ? error.message : 'OAuth login failed' });
      
      // Clean up URL parameters
      router.replace('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left background */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-6">
              Welcome Back to ScrumiX
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Efficient agile project management platform that makes team collaboration simpler
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                </div>
                <span>Visual Scrum board management</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                </div>
                <span>Real-time team collaboration and communication</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                </div>
                <span>Detailed project data analysis</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex flex-col px-6 sm:px-12 lg:px-16 xl:px-20 relative">
        {/* Home Button - Fixed position top-right */}
        <div className="absolute top-6 right-6 z-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200"
            title="Back to Home"
          >
            <Home className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Home
            </span>
          </Link>
        </div>

        {/* Centered form content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            {/* Logo and title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">S</span>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">ScrumiX</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Sign in to your account
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Continue your agile project management journey
              </p>
            </div>

          {/* Social login */}
          <div className="space-y-3 mb-6">
            {/* Google login - temporarily hidden
            <button
              onClick={() => handleSocialLogin('google')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
              <span className="text-gray-700 dark:text-gray-300">Sign in with Google</span>
            </button>
            */}
            {/* GitHub login - temporarily hidden
            <button
              onClick={() => handleSocialLogin('github')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Github className="w-5 h-5" />
              <span className="text-gray-700 dark:text-gray-300">Sign in with GitHub</span>
            </button>
            */}
            <button
              onClick={handleKeycloakLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Shield className="w-5 h-5" />
              <span className="text-gray-700 dark:text-gray-300">Sign in with Keycloak</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                Or sign in with email
              </span>
            </div>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-colors ${
                    errors.email 
                      ? 'border-red-300 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-colors ${
                    errors.password 
                      ? 'border-red-300 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Remember me and forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Remember me
                </label>
              </div>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
              </div>
            )}

            {/* OAuth error */}
            {errors.oauth && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.oauth}</p>
              </div>
            )}

            {/* Success message */}
            {errors.success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">{errors.success}</p>
              </div>
            )}

            {/* Login button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Signup link */}
          <div className="text-center mt-6">
            <p className="text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                href="/auth/signup"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Sign up for free
              </Link>
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 