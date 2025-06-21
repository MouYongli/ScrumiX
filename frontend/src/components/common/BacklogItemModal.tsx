import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface BacklogItem {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: 'high' | 'medium' | 'low';
  status: 'new' | 'ready' | 'in-progress' | 'done' | 'blocked';
  storyPoints: number;
  createdAt: string;
  lastUpdated: string;
  assignee?: string;
  labels: ('epic' | 'user-story' | 'bug' | 'enhancement')[];
  parentId?: string;
  type: 'epic' | 'user-story' | 'bug' | 'enhancement';
  hierarchyLevel: number;
}

interface BacklogItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<BacklogItem, 'id' | 'createdAt' | 'lastUpdated'>) => void;
  editingItem?: BacklogItem | null;
}

const BacklogItemModal: React.FC<BacklogItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingItem
}) => {
  const [formData, setFormData] = useState<Omit<BacklogItem, 'id' | 'createdAt' | 'lastUpdated'>>({
    title: '',
    description: '',
    acceptanceCriteria: [''],
    priority: 'medium',
    status: 'new',
    storyPoints: 0,
    assignee: '',
    labels: [],
    parentId: undefined,
    type: 'user-story',
    hierarchyLevel: 1
  });

  useEffect(() => {
    if (editingItem) {
      const { id, createdAt, lastUpdated, ...rest } = editingItem;
      setFormData(rest);
    } else {
      setFormData({
        title: '',
        description: '',
        acceptanceCriteria: [''],
        priority: 'medium',
        status: 'new',
        storyPoints: 0,
        assignee: '',
        labels: [],
        parentId: undefined,
        type: 'user-story',
        hierarchyLevel: 1
      });
    }
  }, [editingItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine type based on selected labels
    let itemType: 'epic' | 'user-story' | 'bug' | 'enhancement' = 'user-story';
    let hierarchyLevel = 1;
    
    if (formData.labels.includes('epic')) {
      itemType = 'epic';
      hierarchyLevel = 0;
    } else if (formData.labels.includes('bug')) {
      itemType = 'bug';
      hierarchyLevel = 0;
    } else if (formData.labels.includes('enhancement')) {
      itemType = 'enhancement';
      hierarchyLevel = 0;
    } else if (formData.labels.includes('user-story')) {
      itemType = 'user-story';
      hierarchyLevel = 1;
    }
    
    // Filter out empty acceptance criteria and add computed fields
    const filteredData = {
      ...formData,
      acceptanceCriteria: formData.acceptanceCriteria.filter(criteria => criteria.trim() !== ''),
      type: itemType,
      hierarchyLevel: hierarchyLevel,
      // Clear parent if epic (since epics can't have parents)
      parentId: itemType === 'epic' ? undefined : formData.parentId
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
      acceptanceCriteria: newCriteria.length > 0 ? newCriteria : ['']
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

  const toggleLabel = (label: 'epic' | 'user-story' | 'bug' | 'enhancement') => {
    const newLabels = formData.labels.includes(label)
      ? formData.labels.filter(l => l !== label)
      : [...formData.labels, label];
    
    // Clear parent if epic is selected (epics can't have parents)
    const newParentId = newLabels.includes('epic') ? undefined : formData.parentId;
    
    setFormData({ 
      ...formData, 
      labels: newLabels,
      parentId: newParentId
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editingItem ? `Edit PBI-${editingItem.id.padStart(3, '0')}` : 'Add New Product Backlog Item'}
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
              placeholder="As a [role], I want [feature] so that [benefit]..."
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
                  {formData.acceptanceCriteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAcceptanceCriteria(index)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Labels
            </label>
            <div className="flex flex-wrap gap-2">
              {(['epic', 'user-story', 'bug', 'enhancement'] as const).map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleLabel(label)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    formData.labels.includes(label)
                      ? getLabelColor(label)
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                  }`}
                >
                  {label.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Parent Item Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Parent Item
            </label>
                          <select
                value={formData.parentId || ''}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || undefined })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={formData.labels.includes('epic')}
              >
                <option value="">None (Root Level)</option>
                {/* Available parent items - typically Epics that can have User Stories as children */}
                <option value="001">EPIC-001 - User Authentication System</option>
                <option value="005">EPIC-005 - E-commerce Shopping Features</option>
              </select>
            {formData.labels.includes('epic') && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Epics cannot have parent items
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
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'high' | 'medium' | 'low' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'new' | 'ready' | 'in-progress' | 'done' | 'blocked' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="new">New</option>
                <option value="ready">Ready</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          {/* Story Points and Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Story Points
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.storyPoints}
                onChange={(e) => setFormData({ ...formData, storyPoints: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Effort estimation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assignee
              </label>
              <input
                type="text"
                value={formData.assignee || ''}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Team member (optional)"
              />
            </div>
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