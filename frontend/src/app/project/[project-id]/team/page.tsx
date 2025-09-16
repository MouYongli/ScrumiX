'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Filter, Mail, Phone, MapPin, Edit2, Trash2, 
  FolderOpen, Users, Crown, Shield, Code, Settings, MoreHorizontal,
  Calendar, Clock, CheckCircle2, UserPlus, MessageSquare, Star
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import InviteMemberModal from '@/components/common/InviteMemberModal';
import EditMemberModal from '@/components/common/EditMemberModal';
import DeleteMemberModal from '@/components/common/DeleteMemberModal';
import { useDateFormat } from '@/hooks/useDateFormat';
import { api } from '@/utils/api';
import { ProjectMemberResponse } from '@/types/api';

// Component for rendering user-aware formatted dates
const FormattedDate: React.FC<{ 
  date: Date; 
  includeTime?: boolean; 
  short?: boolean;
}> = ({ date, includeTime = false, short = false }) => {
  const [formattedDate, setFormattedDate] = useState<string>(date.toLocaleDateString());
  const { formatDate, formatDateShort } = useDateFormat();

  useEffect(() => {
    let isMounted = true;
    
    const format = async () => {
      try {
        // When includeTime is true, always use formatDate regardless of short flag
        // formatDateShort doesn't support time display
        const result = includeTime 
          ? await formatDate(date, true)
          : short 
            ? await formatDateShort(date)
            : await formatDate(date, false);
        
        if (isMounted) {
          setFormattedDate(result);
        }
      } catch (error) {
        console.error('Error formatting date:', error);
        // Fallback to simple formatting
        if (isMounted) {
          setFormattedDate(
            includeTime 
              ? `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
              : date.toLocaleDateString()
          );
        }
      }
    };
    
    // Add a small delay to batch API calls
    const timeoutId = setTimeout(format, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [date, includeTime, short, formatDate, formatDateShort]);

  return <span>{formattedDate}</span>;
};

interface TeamMember extends ProjectMemberResponse {}

interface ProjectTeamProps {
  params: Promise<{ 'project-id': string }>;
}

// Empty array for real data
const mockTeamMembers: TeamMember[] = [];

const ProjectTeam: React.FC<ProjectTeamProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('Project');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProjectMemberResponse | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: projectName, href: `/project/${projectId}/dashboard` },
    { label: 'Team Members', icon: <Users className="w-4 h-4" /> }
  ];

  // Fetch team members and project data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch project details to get the name
        const projectResponse = await api.projects.getById(parseInt(projectId));
        if (projectResponse.data) {
          setProjectName(projectResponse.data.name);
          setCurrentUserRole(projectResponse.data.user_role || null);
        }
        
        // Fetch team members
        const membersResponse = await api.projects.getMembers(parseInt(projectId));
        if (membersResponse.error) {
          setError(membersResponse.error);
        } else if (membersResponse.data) {
          setTeamMembers(membersResponse.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const handleMemberInvited = (newMember: ProjectMemberResponse) => {
    setTeamMembers(prev => [...prev, newMember]);
    setSuccessMessage(`${newMember.full_name || newMember.username || newMember.email} has been invited to the project!`);
    
    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleMemberUpdated = (updatedMember: ProjectMemberResponse) => {
    setTeamMembers(prev => prev.map(member => 
      member.id === updatedMember.id ? updatedMember : member
    ));
    setSuccessMessage(`${updatedMember.full_name || updatedMember.username || updatedMember.email}'s role has been updated!`);
    
    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleMemberDeleted = (memberId: number) => {
    const deletedMember = teamMembers.find(member => member.id === memberId);
    setTeamMembers(prev => prev.filter(member => member.id !== memberId));
    
    if (deletedMember) {
      setSuccessMessage(`${deletedMember.full_name || deletedMember.username || deletedMember.email} has been removed from the project!`);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const openEditModal = (member: ProjectMemberResponse) => {
    setSelectedMember(member);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (member: ProjectMemberResponse) => {
    setSelectedMember(member);
    setIsDeleteModalOpen(true);
  };

  // Filter team members
  const filteredMembers = teamMembers.filter(member => {
    const displayName = member.full_name || member.username || member.email;
    const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'product_owner': return <Crown className="w-4 h-4" />;
      case 'scrum_master': return <Shield className="w-4 h-4" />;
      case 'developer': return <Code className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'product_owner': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      case 'scrum_master': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'developer': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };



  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'product_owner': return 'Product Owner';
      case 'scrum_master': return 'Scrum Master';
      case 'developer': return 'Developer';
      default: return 'Team Member';
    }
  };

  const teamStats = {
    total: teamMembers.length,
    productOwners: teamMembers.filter(m => m.role === 'product_owner').length,
    scrumMasters: teamMembers.filter(m => m.role === 'scrum_master').length,
    developers: teamMembers.filter(m => m.role === 'developer').length,
  };

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Team Members
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your project team members and their roles
          </p>
        </div>
        <div className="flex gap-3">
          {(currentUserRole === 'product_owner' || currentUserRole === 'scrum_master') && (
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <p className="text-green-700 dark:text-green-300">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Members</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Developers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.developers}</p>
            </div>
            <Code className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Leadership</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.productOwners + teamStats.scrumMasters}</p>
            </div>
            <Crown className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Roles</option>
              <option value="product_owner">Product Owner</option>
              <option value="scrum_master">Scrum Master</option>
              <option value="developer">Developer</option>
            </select>



            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading team members...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-12">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-600 dark:text-red-400 mb-2">Failed to load team members</p>
            <p className="text-sm text-red-500 dark:text-red-300">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Team Members Display */}
      {!loading && !error && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMembers.map((member) => (
                <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                                            {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name || member.username || member.email}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-500 dark:text-gray-400 text-lg font-semibold">
                          {(member.full_name || member.username || member.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {member.full_name || member.username || member.email}
                        </h3>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                          {getRoleIcon(member.role)}
                          {getRoleDisplayName(member.role)}
                        </div>
                      </div>
                    </div>
                    {member.is_admin && (
                      <Crown className="w-4 h-4 text-yellow-500" aria-label="Admin" />
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Mail className="w-4 h-4" />
                      {member.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      Joined <FormattedDate date={new Date(member.joined_at)} short={true} />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {(currentUserRole === 'product_owner' || currentUserRole === 'scrum_master') && (
                      <>
                        <button 
                          onClick={() => openEditModal(member)}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Edit member role"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(member)}
                          className="px-3 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-700 rounded transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.full_name || member.username || member.email}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <span className="text-gray-500 dark:text-gray-400 text-sm font-semibold">
                                {(member.full_name || member.username || member.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {member.full_name || member.username || member.email}
                            </div>
                            {member.is_admin && <Crown className="w-3 h-3 text-yellow-500" />}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                        {getRoleIcon(member.role)}
                        {getRoleDisplayName(member.role)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(currentUserRole === 'product_owner' || currentUserRole === 'scrum_master') && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => openEditModal(member)}
                            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                            title="Edit member role"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openDeleteModal(member)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          )}
        </>
      )}

      {!loading && !error && filteredMembers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No team members found</h3>
          <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
        </div>
      )}

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        projectId={projectId}
        onMemberInvited={handleMemberInvited}
      />

      {/* Edit Member Modal */}
      {selectedMember && (
        <EditMemberModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          projectId={projectId}
          member={selectedMember}
          onMemberUpdated={handleMemberUpdated}
        />
      )}

      {/* Delete Member Modal */}
      {selectedMember && (
        <DeleteMemberModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          projectId={projectId}
          member={selectedMember}
          onMemberDeleted={handleMemberDeleted}
        />
      )}
    </div>
  );
};

export default ProjectTeam;
