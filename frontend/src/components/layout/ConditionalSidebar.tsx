import React from 'react';
import { usePathname } from 'next/navigation';
import GlobalSidebar from './GlobalSidebar';
import ProjectSidebar from './ProjectSidebar';

interface ConditionalSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const ConditionalSidebar: React.FC<ConditionalSidebarProps> = ({ 
  isCollapsed, 
  onToggle 
}) => {
  const pathname = usePathname();
  
  // Check if in project page
  const isProjectPage = pathname.startsWith('/project/');
  
  // Extract project ID
  const projectId = isProjectPage 
    ? pathname.split('/')[2] 
    : null;

  if (isProjectPage && projectId) {
    return (
      <ProjectSidebar 
        projectId={projectId}
        isCollapsed={isCollapsed}
        onToggle={onToggle}
      />
    );
  }

  return (
    <GlobalSidebar 
      isCollapsed={isCollapsed}
      onToggle={onToggle}
    />
  );
};

export default ConditionalSidebar; 