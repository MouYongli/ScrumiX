'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import AIChat from '@/components/chat/AIChat';

const AIChatPage: React.FC = () => {
  const params = useParams();
  const projectId = params['project-id'] as string;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AIChat projectId={projectId} />
    </div>
  );
};

export default AIChatPage;
