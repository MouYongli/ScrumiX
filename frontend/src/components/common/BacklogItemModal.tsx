import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

import { BacklogPriority, BacklogStatus, BacklogType, ApiBacklog } from '@/types/api';
import { api } from '@/utils/api';

interface BacklogFormData {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: BacklogPriority;
  status: BacklogStatus;
  story_point: number;
  parent_id?: number;
  item_type: BacklogType;
}

interface BacklogItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: BacklogFormData) => void;
  editingItem?: (BacklogFormData & { id?: number }) | null;
  projectId: number;
}

const BacklogItemModal: React.FC<BacklogItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingItem,
  projectId
}) => {
  const [formData, setFormData] = useState<BacklogFormData>({
    title: '',
    description: '',
    acceptanceCriteria: [],
    priority: BacklogPriority.MEDIUM,
    status: BacklogStatus.TODO,
    story_point: 0,
    parent_id: undefined,
    item_type: BacklogType.STORY
  });

  const [epics, setEpics] = useState<ApiBacklog[]>([]);
  const [isLoadingEpics, setIsLoadingEpics] = useState(false);
  const [epicsRefreshed, setEpicsRefreshed] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else {
      // Reset form to default values when opening for new item creation
      setFormData({
        title: '',
        description: '',
        acceptanceCriteria: [],
        priority: BacklogPriority.MEDIUM,
        status: BacklogStatus.TODO,
        story_point: 0,
        parent_id: undefined,
        item_type: BacklogType.STORY
      });
    }
  }, [editingItem, isOpen]); // Added isOpen to dependency array to reset form when modal opens

  // Fetch epics for parent selection
  useEffect(() => {
    const fetchEpics = async () => {
      if (!projectId || !isOpen) return;
      
      try {
        setIsLoadingEpics(true);
        const response = await api.backlogs.getEpics(projectId);
        if (response.error) {
          console.error('Failed to fetch epics:', response.error);
          return;
        }
        setEpics(response.data || []);
        setEpicsRefreshed(true);
        setTimeout(() => setEpicsRefreshed(false), 3000); // Clear indicator after 3 seconds
      } catch (error) {
        console.error('Error fetching epics:', error);
      } finally {
        setIsLoadingEpics(false);
      }
    };

    fetchEpics();
  }, [projectId, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty acceptance criteria and allow empty array
    const filteredData = {
      ...formData,
      acceptanceCriteria: formData.acceptanceCriteria.filter(criteria => criteria.trim() !== ''),
      // Clear parent if epic (since epics can't have parents)
      parent_id: formData.item_type === BacklogType.EPIC ? undefined : formData.parent_id
    };
    

    onSubmit(filteredData);
  };

  const addAcceptanceCriteria = () => {
    setFormData({
      ...formData,
      acceptanceCriteria: [...formData.acceptanceCriteria, '']
    });
  };

  const removeAcceptanceCriteria = (index: number) => {
    const newCriteria = formData.acceptanceCriteria.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      acceptanceCriteria: newCriteria
    });
  };

  const updateAcceptanceCriteria = (index: number, value: string) => {
    const newCriteria = [...formData.acceptanceCriteria];
    newCriteria[index] = value;
    setFormData({
      ...formData,
      acceptanceCriteria: newCriteria
    });
  };



  const getLabelColor = (label: string) => {
    switch (label) {
      case 'epic': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'user-story': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'bug': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'enhancement': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getDescriptionPlaceholder = () => {
    switch (formData.item_type) {
      case BacklogType.BUG:
        return "Describe the bug";
      case BacklogType.EPIC:
        return "As a [role], I want [feature] so that [benefit]...";
      case BacklogType.STORY:
      default:
        return "As a [role], I want [feature] so that [benefit]...";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editingItem && editingItem.id ? `Edit PBI-${editingItem.id.toString().padStart(3, '0')}` : 'Add New Product Backlog Item'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Concise and descriptive title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description*
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={getDescriptionPlaceholder()}
              required
            />
          </div>

          {/* Acceptance Criteria */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Acceptance Criteria
              </label>
              <button
                type="button"
                onClick={addAcceptanceCriteria}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Criteria
              </button>
            </div>
            {formData.acceptanceCriteria.length > 0 && (
              <div className="space-y-2">
                {formData.acceptanceCriteria.map((criteria, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={criteria}
                      onChange={(e) => updateAcceptanceCriteria(index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder={`Acceptance criteria #${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeAcceptanceCriteria(index)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Item Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Item Type *
            </label>
             <select
               value={formData.item_type}
               onChange={(e) => setFormData({ ...formData, item_type: e.target.value as BacklogType })}
               className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
             >
               <option value={BacklogType.EPIC}>Epic</option>
               <option value={BacklogType.STORY}>User Story</option>
               <option value={BacklogType.BUG}>Bug</option>
             </select>
          </div>

          {/* Parent Item Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Parent Item
              </label>
              <div className="flex items-center gap-2">
                {epicsRefreshed && (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Updated!
                  </span>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    if (!projectId) return;
                    setIsLoadingEpics(true);
                    try {
                      const response = await api.backlogs.getEpics(projectId);
                      if (!response.error) {
                        setEpics(response.data || []);
                        setEpicsRefreshed(true);
                        setTimeout(() => setEpicsRefreshed(false), 3000);
                      }
                    } catch (error) {
                      console.error('Error refreshing epics:', error);
                    } finally {
                      setIsLoadingEpics(false);
                    }
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  disabled={isLoadingEpics}
                >
                  <svg className={`w-3 h-3 ${isLoadingEpics ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isLoadingEpics ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
            <select
              value={formData.parent_id || ''}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={formData.item_type === BacklogType.EPIC}
            >
              <option value="">None (Root Level)</option>
              {isLoadingEpics ? (
                <option value="" disabled>Loading epics...</option>
              ) : epics.length === 0 ? (
                <option value="" disabled>No epics available</option>
              ) : (
                epics.map((epic) => (
                  <option key={epic.id} value={epic.id}>
                    EPIC-{epic.id}: {epic.title}
                  </option>
                ))
              )}
            </select>
            {formData.item_type === BacklogType.EPIC && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Epics cannot have parent items
              </p>
            )}
            {formData.item_type !== BacklogType.EPIC && epics.length === 0 && !isLoadingEpics && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                No epics found. Create an Epic first to use as a parent, or click refresh if you just created one.
              </p>
            )}
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority *
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as BacklogPriority })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={BacklogPriority.HIGH}>High</option>
                <option value={BacklogPriority.MEDIUM}>Medium</option>
                <option value={BacklogPriority.LOW}>Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status *
              </label>
                           <select
               value={formData.status}
               onChange={(e) => setFormData({ ...formData, status: e.target.value as BacklogStatus })}
               className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
             >
               <option value={BacklogStatus.TODO}>Todo</option>
               <option value={BacklogStatus.IN_PROGRESS}>In Progress</option>
               <option value={BacklogStatus.IN_REVIEW}>In Review</option>
               <option value={BacklogStatus.DONE}>Done</option>
               <option value={BacklogStatus.CANCELLED}>Cancelled</option>
             </select>
            </div>
          </div>

          {/* Story Points */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Story Points
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.story_point}
              onChange={(e) => setFormData({ ...formData, story_point: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Effort estimation"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingItem ? 'Save Changes' : 'Add PBI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BacklogItemModal; 