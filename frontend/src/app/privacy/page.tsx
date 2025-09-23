'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Lock, Database, Globe, Mail } from 'lucide-react';
import { useAuthStatus } from '@/hooks/useAuthStatus';

const PrivacyPage = () => {
  const lastUpdated = "December 2024";
  const { isAuthenticated: isUserAuth, isLoading: authLoading } = useAuthStatus();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4 mb-4">
            {!authLoading && !isUserAuth && (
              <Link 
                href="/"
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Home
              </Link>
            )}
          </div>
          
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Privacy Policy
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Last updated: {lastUpdated}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-3">
            Your Privacy Matters to Us
          </h2>
          <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
            At ScrumiX, we are committed to protecting your privacy and ensuring the security of your personal information. 
            This Privacy Policy explains how we collect, use, and safeguard your data when you use our agile project management platform.
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            
            {/* Information We Collect */}
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Information We Collect
                </h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Personal Information</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    We collect information you provide directly to us, such as when you create an account, 
                    set up a project, or contact our support team. This may include your name, email address, 
                    profile information, and any content you create within the platform.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Usage Information</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    We automatically collect information about how you use ScrumiX, including your interactions 
                    with features, pages visited, time spent on the platform, and technical information about 
                    your device and browser.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Project Data</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    We store the content you create within ScrumiX, including projects, sprints, tasks, 
                    meeting notes, and documentation. This data is essential for providing our services 
                    and is only accessible to you and your authorized team members.
                  </p>
                </div>
              </div>
            </div>

            {/* How We Use Information */}
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Database className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  How We Use Your Information
                </h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>Service Provision:</strong> To provide, maintain, and improve ScrumiX features and functionality
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>Communication:</strong> To send you important updates, security alerts, and support messages
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>Analytics:</strong> To understand usage patterns and improve our platform performance
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>Security:</strong> To protect against fraud, abuse, and unauthorized access
                  </p>
                </div>
              </div>
            </div>

            {/* Data Protection */}
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Lock className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Data Protection & Security
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Security Measures</h3>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></div>
                      End-to-end encryption for data transmission
                    </li>
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></div>
                      Regular security audits and penetration testing
                    </li>
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></div>
                      Multi-factor authentication support
                    </li>
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></div>
                      SOC 2 Type II compliance
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Your Rights</h3>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></div>
                      Access your personal data
                    </li>
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></div>
                      Correct inaccurate information
                    </li>
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></div>
                      Delete your account and data
                    </li>
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></div>
                      Data portability and export
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Sharing */}
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Globe className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Data Sharing & Third Parties
                </h2>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  We do not sell, rent, or trade your personal information to third parties. We may share your 
                  information only in the following limited circumstances:
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                    <li><strong>Service Providers:</strong> With trusted partners who help us operate our platform (hosting, analytics, support)</li>
                    <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and users' safety</li>
                    <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                    <li><strong>With Your Consent:</strong> When you explicitly authorize us to share specific information</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Cookies and Tracking */}
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Database className="w-6 h-6 text-red-600 dark:text-red-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Cookies & Tracking Technologies
                </h2>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  We use cookies and similar technologies to enhance your experience, remember your preferences, 
                  and analyze how our platform is used. You can control cookie settings through your browser preferences.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Essential Cookies</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Required for basic platform functionality and security
                    </p>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Preference Cookies</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Remember your settings and personalization choices
                    </p>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Analytics Cookies</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Help us understand usage patterns and improve our service
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Retention */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Data Retention
              </h2>
              
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  We retain your personal information only for as long as necessary to provide our services 
                  and fulfill the purposes outlined in this privacy policy. Specific retention periods include:
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <strong className="text-gray-900 dark:text-white">Account Data:</strong>
                      <span className="text-gray-600 dark:text-gray-400 ml-2">
                        Retained while your account is active and for 30 days after deletion
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <strong className="text-gray-900 dark:text-white">Project Data:</strong>
                      <span className="text-gray-600 dark:text-gray-400 ml-2">
                        Retained according to your project settings and team requirements
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <strong className="text-gray-900 dark:text-white">Usage Analytics:</strong>
                      <span className="text-gray-600 dark:text-gray-400 ml-2">
                        Aggregated and anonymized data retained for up to 2 years
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* International Transfers */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                International Data Transfers
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                ScrumiX operates globally and may transfer your personal information to countries other than 
                where you reside. We ensure appropriate safeguards are in place to protect your information 
                during such transfers, including:
              </p>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></div>
                  Standard Contractual Clauses approved by the European Commission
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></div>
                  Adequacy decisions by relevant data protection authorities
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></div>
                  Other appropriate safeguards as required by applicable law
                </li>
              </ul>
            </div>

            {/* Your Choices */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Your Choices & Controls
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Account Settings</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    Update your profile information, notification preferences, and privacy settings 
                    through your account dashboard.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Data Export</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    Request a copy of your personal data in a portable format through your 
                    account settings or by contacting support.
                  </p>
                </div>
              </div>
            </div>

            {/* Updates to Policy */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Updates to This Policy
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our practices 
                or applicable laws. We will notify you of any material changes by posting the updated 
                policy on our website and, where appropriate, through email or in-app notifications.
              </p>
            </div>

            {/* Contact Information */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700">
              <div className="flex items-center mb-4">
                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Contact Us
                </h2>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              
              <div className="space-y-2 text-gray-600 dark:text-gray-400">
                <p><strong>Email:</strong></p>
                <p><strong>Address:</strong> </p>
                <p><strong>Phone:</strong> </p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  For EU residents: You have the right to lodge a complaint with your local data protection authority 
                  if you believe we have not addressed your concerns adequately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
