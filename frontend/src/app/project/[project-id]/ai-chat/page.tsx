'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import AIChat from '@/components/chat/AIChat';
import Breadcrumb from '@/components/common/Breadcrumb';
import { AuthGuard } from '@/components/auth/AuthGuard';

const AIChatPage: React.FC = () => {
  const params = useParams();
  const projectId = params['project-id'] as string;

  const breadcrumbItems = [
    {
      label: 'ScrumiX',
      href: `/project/${projectId}/dashboard`,
      id: 'scrumix'
    },
    {
      label: 'AIChat',
      icon: <Sparkles className="w-4 h-4" />,
      id: 'aichat'
    }
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6">
          <Breadcrumb items={breadcrumbItems} />
          <AIChat projectId={projectId} />
        </div>
      </div>
    </AuthGuard>
  );
};

export default AIChatPage;
