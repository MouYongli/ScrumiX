import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface UserStory {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft' | 'ready' | 'in-progress' | 'testing' | 'done';
  storyPoints: number;
  epic?: string;
  sprint?: string;
  assignee?: string;
  labels: string[];
  createdAt: string;
  estimatedHours?: number;
}

interface Epic {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface UserStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (story: Omit<UserStory, 'id' | 'createdAt'>) => void;
  editingStory?: UserStory | null;
  epics?: Epic[];
}

const UserStoryModal: React.FC<UserStoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingStory,
  epics = []
}) => {
  const [formData, setFormData] = useState<Omit<UserStory, 'id' | 'createdAt'>>({
    title: '',
    asA: '',
    iWant: '',
    soThat: '',
    acceptanceCriteria: [''],
    priority: 'medium',
    status: 'draft',
    storyPoints: 0,
    epic: '',
    sprint: '',
    assignee: '',
    labels: [],
    estimatedHours: 0
  });

  const [newLabel, setNewLabel] = useState('');

  useEffect(() => {
    if (editingStory) {
      const { id, createdAt, ...rest } = editingStory;
      setFormData(rest);
    } else {
      setFormData({
        title: '',
        asA: '',
        iWant: '',
        soThat: '',
        acceptanceCriteria: [''],
        priority: 'medium',
        status: 'draft',
        storyPoints: 0,
        epic: '',
        sprint: '',
        assignee: '',
        labels: [],
        estimatedHours: 0
      });
    }
  }, [editingStory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty acceptance criteria
    const filteredCriteria = formData.acceptanceCriteria.filter(criteria => criteria.trim() !== '');
    onSubmit({
      ...formData,
      acceptanceCriteria: filteredCriteria
    });
  };

  const addAcceptanceCriteria = () => {
    setFormData({
      ...formData,
      acceptanceCriteria: [...formData.acceptanceCriteria, '']
    });
  };

  const updateAcceptanceCriteria = (index: number, value: string) => {
    const updated = [...formData.acceptanceCriteria];
    updated[index] = value;
    setFormData({
      ...formData,
      acceptanceCriteria: updated
    });
  };

  const removeAcceptanceCriteria = (index: number) => {
    const updated = formData.acceptanceCriteria.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      acceptanceCriteria: updated
    });
  };

  const addLabel = () => {
    if (newLabel.trim() && !formData.labels.includes(newLabel.trim())) {
      setFormData({
        ...formData,
        labels: [...formData.labels, newLabel.trim()]
      });
      setNewLabel('');
    }
  };

  const removeLabel = (labelToRemove: string) => {
    setFormData({
      ...formData,
      labels: formData.labels.filter(label => label !== labelToRemove)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLabel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editingStory ? 'Edit User Story' : 'Create New User Story'}
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
              Story Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
              placeholder="e.g., User Registration"
            />
          </div>

          {/* User Story Format */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                As a... *
              </label>
              <input
                type="text"
                value={formData.asA}
                onChange={(e) => setFormData({ ...formData, asA: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                placeholder="e.g., new visitor, customer, admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                I want... *
              </label>
              <input
                type="text"
                value={formData.iWant}
                onChange={(e) => setFormData({ ...formData, iWant: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                placeholder="e.g., to create an account with email and password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                So that... *
              </label>
              <input
                type="text"
                value={formData.soThat}
                onChange={(e) => setFormData({ ...formData, soThat: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                placeholder="e.g., I can access personalized features"
              />
            </div>
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
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
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
                    placeholder={`Acceptance criteria ${index + 1}`}
                  />
                  {formData.acceptanceCriteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAcceptanceCriteria(index)}
                      className="text-red-600 hover:text-red-700 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="in-progress">In Progress</option>
                <option value="testing">Testing</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          {/* Story Points and Estimated Hours */}
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estimated Hours
              </label>
              <input
                type="number"
                min="0"
                value={formData.estimatedHours || ''}
                onChange={(e) => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Epic and Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Epic
              </label>
              <select
                value={formData.epic || ''}
                onChange={(e) => setFormData({ ...formData, epic: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">No Epic</option>
                {epics.map(epic => (
                  <option key={epic.id} value={epic.name}>{epic.name}</option>
                ))}
              </select>
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
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Labels
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Add a label and press Enter"
              />
              <button
                type="button"
                onClick={addLabel}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            {formData.labels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.labels.map((label, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full"
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => removeLabel(label)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

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
              {editingStory ? 'Save Changes' : 'Create Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserStoryModal; 