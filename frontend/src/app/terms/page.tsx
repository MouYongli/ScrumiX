'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, FileText, Scale, Shield, AlertTriangle, 
  CheckCircle, XCircle, Mail, Clock
} from 'lucide-react';
import { useAuthStatus } from '@/hooks/useAuthStatus';

const TermsPage = () => {
  const lastUpdated = "December 2024";
  const effectiveDate = "January 1, 2025";
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
            <Scale className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Terms of Service
              </h1>
              <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span>Last updated: {lastUpdated}</span>
                <span>•</span>
                <span>Effective: {effectiveDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Important Notice */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
                Important Legal Agreement
              </h2>
              <p className="text-amber-800 dark:text-amber-200 leading-relaxed">
                By accessing or using ScrumiX, you agree to be bound by these Terms of Service. 
                Please read them carefully before using our platform. If you do not agree to these terms, 
                you may not use ScrumiX.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            
            {/* Acceptance of Terms */}
            <div className="p-6">
              <div className="flex items-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  1. Acceptance of Terms
                </h2>
              </div>
              
              <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                <p>
                  These Terms of Service ("Terms") constitute a legally binding agreement between you and ScrumiX 
                  regarding your use of the ScrumiX platform and related services. By creating an account or using 
                  any part of our service, you acknowledge that you have read, understood, and agree to be bound by these Terms.
                </p>
                <p>
                  If you are entering into these Terms on behalf of a company or other legal entity, you represent 
                  that you have the authority to bind such entity to these Terms.
                </p>
              </div>
            </div>

            {/* Service Description */}
            <div className="p-6">
              <div className="flex items-center mb-4">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  2. Service Description
                </h2>
              </div>
              
              <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                <p>
                  ScrumiX is an agile project management platform designed to help teams implement Scrum methodology 
                  effectively. Our services include but are not limited to:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                      <span>Project and sprint management</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                      <span>Backlog and task tracking</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                      <span>Team collaboration tools</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                      <span>Meeting management and notes</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                      <span>Reporting and analytics</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                      <span>Documentation and wiki features</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* User Accounts */}
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  3. User Accounts and Responsibilities
                </h2>
              </div>
              
              <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Account Security</h3>
                  <p>
                    You are responsible for maintaining the confidentiality of your account credentials and 
                    for all activities that occur under your account. You must notify us immediately of any 
                    unauthorized use of your account.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Acceptable Use</h3>
                  <p>You agree to use ScrumiX only for lawful purposes and in accordance with these Terms. You may not:</p>
                  <ul className="mt-2 space-y-1 ml-4">
                    <li>• Use the service to violate any applicable laws or regulations</li>
                    <li>• Interfere with or disrupt the service or servers</li>
                    <li>• Attempt to gain unauthorized access to other users' accounts or data</li>
                    <li>• Upload malicious code, viruses, or harmful content</li>
                    <li>• Use the service for spam or unsolicited communications</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data and Content */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Your Data and Content
              </h2>
              
              <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Ownership</h3>
                  <p>
                    You retain ownership of all content and data you upload, create, or store in ScrumiX. 
                    We do not claim ownership of your intellectual property.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">License to Us</h3>
                  <p>
                    By using ScrumiX, you grant us a limited, non-exclusive license to access, use, and process 
                    your content solely for the purpose of providing our services to you and your team.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Data Backup and Recovery</h3>
                  <p>
                    While we maintain regular backups of our systems, you are responsible for maintaining your own 
                    backups of important data. We recommend regularly exporting your project data.
                  </p>
                </div>
              </div>
            </div>

            {/* Service Availability */}
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  5. Service Availability and Modifications
                </h2>
              </div>
              
              <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                <p>
                  We strive to provide reliable service but cannot guarantee 100% uptime. We may occasionally 
                  need to suspend service for maintenance, updates, or unforeseen circumstances.
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Service Level Commitment</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Target uptime: 99.5% monthly availability</li>
                    <li>• Planned maintenance windows with advance notice</li>
                    <li>• Status page updates for service incidents</li>
                    <li>• Data backup and disaster recovery procedures</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Limitation of Liability */}
            <div className="p-6">
              <div className="flex items-center mb-4">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  6. Limitation of Liability
                </h2>
              </div>
              
              <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                <p>
                  To the maximum extent permitted by applicable law, ScrumiX shall not be liable for any indirect, 
                  incidental, special, consequential, or punitive damages, including but not limited to loss of 
                  profits, data, use, or other intangible losses.
                </p>
                
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-800 dark:text-red-200 text-sm">
                    <strong>Important:</strong> Our total liability to you for all claims arising from or relating 
                    to these Terms or your use of ScrumiX shall not exceed the amount you paid us in the 12 months 
                    preceding the claim.
                  </p>
                </div>
              </div>
            </div>

            {/* Termination */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Termination
              </h2>
              
              <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">By You</h3>
                  <p>
                    You may terminate your account at any time through your account settings. Upon termination, 
                    your access to the service will cease immediately.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">By Us</h3>
                  <p>
                    We may suspend or terminate your account if you violate these Terms, engage in fraudulent 
                    activity, or for any other reason at our sole discretion, with or without notice.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Effect of Termination</h3>
                  <p>
                    Upon termination, your right to use ScrumiX will cease immediately. We will provide you with 
                    a reasonable opportunity to export your data, subject to our data retention policies.
                  </p>
                </div>
              </div>
            </div>

            {/* Intellectual Property */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Intellectual Property Rights
              </h2>
              
              <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Our Rights</h3>
                  <p>
                    ScrumiX, including its software, features, and content, is owned by us and protected by 
                    copyright, trademark, and other intellectual property laws. You may not copy, modify, 
                    distribute, or create derivative works based on our platform.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Your Rights</h3>
                  <p>
                    Subject to these Terms, we grant you a limited, non-exclusive, non-transferable license 
                    to use ScrumiX for your internal business purposes during the term of your subscription.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy and Data Protection */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Privacy and Data Protection
              </h2>
              
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Your privacy is important to us. Our collection and use of personal information is governed by 
                our Privacy Policy, which is incorporated into these Terms by reference.
              </p>
              
              <Link 
                href="/privacy"
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <Shield className="w-4 h-4 mr-2" />
                Read our Privacy Policy
              </Link>
            </div>

            {/* Disclaimers */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Disclaimers and Warranties
              </h2>
              
              <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                <p>
                  ScrumiX is provided "as is" and "as available" without any warranties of any kind, either 
                  express or implied. We disclaim all warranties, including but not limited to:
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                      <span>Merchantability and fitness for a particular purpose</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                      <span>Non-infringement of third-party rights</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                      <span>Uninterrupted or error-free operation</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                      <span>Security of data transmission or storage</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Governing Law */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                11. Governing Law and Dispute Resolution
              </h2>
              
              <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of [Jurisdiction], 
                  without regard to its conflict of law provisions.
                </p>
                
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Dispute Resolution Process</h3>
                  <ol className="space-y-2 ml-4">
                    <li>1. <strong>Direct Communication:</strong> Contact our support team to resolve issues informally</li>
                    <li>2. <strong>Mediation:</strong> If informal resolution fails, we encourage mediation</li>
                    <li>3. <strong>Arbitration:</strong> Binding arbitration as the final dispute resolution method</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Changes to Terms */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                12. Changes to These Terms
              </h2>
              
              <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                <p>
                  We reserve the right to modify these Terms at any time. We will provide notice of material 
                  changes by posting the updated Terms on our website and notifying you via email or through 
                  the platform.
                </p>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    <strong>Notice Period:</strong> Material changes will take effect 30 days after notice is provided. 
                    Continued use of ScrumiX after the effective date constitutes acceptance of the updated Terms.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700">
              <div className="flex items-center mb-4">
                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Contact Information
                </h2>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 text-gray-600 dark:text-gray-400">
                    <p><strong className="text-gray-900 dark:text-white">Email:</strong></p>
                    <p><strong className="text-gray-900 dark:text-white">Address:</strong></p>
                    <p></p>
                    <p><strong className="text-gray-900 dark:text-white">Phone:</strong></p>
                  </div>
                  
                  <div className="space-y-2">
                    <Link 
                      href="/help"
                      className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Help Center
                    </Link>
                    <Link 
                      href="/privacy"
                      className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Privacy Policy
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Acknowledgment */}
        <div className="mt-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                Thank you for using ScrumiX
              </h3>
              <p className="text-green-700 dark:text-green-300 mt-1">
                By continuing to use our platform, you acknowledge that you have read and agree to these Terms of Service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
