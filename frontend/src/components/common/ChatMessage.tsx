import React, { useState, useEffect } from 'react';
import { Heart, MessageSquare, MoreHorizontal, Download, FileText, Image, Video } from 'lucide-react';

interface MessageAttachment {
  name: string;
  size: string;
  type: string;
  url: string;
}

interface ChatMessageProps {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  type: 'text' | 'file' | 'image';
  attachments?: MessageAttachment[];
  reactions?: { emoji: string; count: number; users: string[] }[];
  isOwn?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (messageId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  id,
  senderId,
  senderName,
  senderAvatar,
  content,
  timestamp,
  type,
  attachments = [],
  reactions = [],
  isOwn = false,
  onReact,
  onReply
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    if (!isClient) {
      return 'Loading...';
    }
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      // Use consistent date formatting
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
      case 'document':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'image':
        return <Image className="w-4 h-4 text-blue-500" />;
      case 'video':
        return <Video className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleEmojiReact = (emoji: string) => {
    if (onReact) {
      onReact(id, emoji);
    }
    setShowReactions(false);
  };

  return (
    <div className={`flex gap-3 group hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded-lg transition-colors ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {senderAvatar ? (
          <img 
            src={senderAvatar} 
            alt={senderName}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {getInitials(senderName)}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 min-w-0 ${isOwn ? 'text-right' : ''}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'justify-end' : ''}`}>
          <span className="font-medium text-gray-900 dark:text-white text-sm">
            {senderName}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimestamp(timestamp)}
          </span>
        </div>

        {/* Message Body */}
        <div className={`${isOwn ? 'bg-blue-600 text-white ml-8' : 'bg-gray-100 dark:bg-gray-700 mr-8'} rounded-lg p-3`}>
          <p className="text-sm">{content}</p>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {attachments.map((attachment, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-2 p-2 rounded ${isOwn ? 'bg-blue-700' : 'bg-white dark:bg-gray-600'}`}
                >
                  {getFileIcon(attachment.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                    <p className="text-xs opacity-75">({attachment.size})</p>
                  </div>
                  <button className="text-xs hover:underline">
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {reactions.map((reaction, index) => (
              <button
                key={index}
                onClick={() => handleEmojiReact(reaction.emoji)}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs hover:bg-gray-200 dark:hover:bg-gray-600"
                title={`${reaction.users.join(', ')} reacted with ${reaction.emoji}`}
              >
                <span>{reaction.emoji}</span>
                <span className="text-gray-600 dark:text-gray-400">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Message Actions (shown on hover) */}
        <div className={`opacity-0 group-hover:opacity-100 transition-opacity mt-2 flex gap-2 ${isOwn ? 'justify-end' : ''}`}>
          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
              title="Add reaction"
            >
              <Heart className="w-3 h-3" />
            </button>
            
            {/* Reaction Picker */}
            {showReactions && (
              <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 flex gap-1 shadow-lg z-10">
                {['👍', '❤️', '😄', '😮', '😢', '😡'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiReact(emoji)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={() => onReply && onReply(id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
            title="Reply"
          >
            <MessageSquare className="w-3 h-3" />
          </button>
          
          <button
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
            title="More options"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 