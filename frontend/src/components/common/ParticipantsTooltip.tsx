'use client';

import React, { useState } from 'react';

interface ParticipantsTooltipProps {
  participants: string[];
  facilitator?: string;
}

const ParticipantsTooltip: React.FC<ParticipantsTooltipProps> = ({ participants, facilitator }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-xs text-gray-500 dark:text-gray-400">Participants:</span>
      <div 
        className="relative flex -space-x-2"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {participants.slice(0, 5).map((participant, index) => (
          <div
            key={index}
            className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            title={participant}
          >
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {participant.charAt(0)}
            </span>
          </div>
        ))}
        {participants.length > 5 && (
          <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">
            <span className="text-xs text-gray-600 dark:text-gray-300">
              +{participants.length - 5}
            </span>
          </div>
        )}
        
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 p-3">
            <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Meeting Participants ({participants.length})
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {participants.map((participant, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-xs text-gray-600 dark:text-gray-300">
                      {participant.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {participant}
                  </span>
                  {facilitator && participant === facilitator && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200 px-1.5 py-0.5 rounded">
                      Host
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Triangle arrow */}
            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200 dark:border-t-gray-700"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantsTooltip; 