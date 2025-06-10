'use client';

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface FavoriteButtonProps {
  item: {
    id: string;
    type: 'project' | 'task' | 'document' | 'sprint';
    title: string;
    description: string;
    url: string;
    metadata?: {
      projectName?: string;
      status?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      dueDate?: string;
      assignee?: string;
    };
  };
  className?: string;
  showText?: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ 
  item, 
  className = '', 
  showText = false 
}) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if already favorited
  useEffect(() => {
    const checkFavoriteStatus = () => {
      try {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const favorited = favorites.some((fav: any) => fav.id === item.id && fav.type === item.type);
        setIsFavorited(favorited);
      } catch (error) {
        console.error('Failed to check favorite status:', error);
      }
    };

    checkFavoriteStatus();
  }, [item.id, item.type]);

  // Toggle favorite status
  const toggleFavorite = async () => {
    setIsLoading(true);
    
    try {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      
      if (isFavorited) {
        // Remove from favorites
        const updatedFavorites = favorites.filter(
          (fav: any) => !(fav.id === item.id && fav.type === item.type)
        );
        localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
        setIsFavorited(false);
      } else {
        // Add to favorites
        const favoriteItem = {
          ...item,
          addedAt: new Date().toISOString(),
        };
        const updatedFavorites = [...favorites, favoriteItem];
        localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
        setIsFavorited(true);
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error('Failed to update favorite status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
        ${isFavorited 
          ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' 
          : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        ${className}
      `}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart 
        className={`w-4 h-4 transition-all duration-200 ${
          isFavorited ? 'fill-current' : ''
        } ${isLoading ? 'animate-pulse' : ''}`} 
      />
      {showText && (
        <span className="text-sm font-medium">
          {isFavorited ? 'Favorited' : 'Favorite'}
        </span>
      )}
    </button>
  );
};

export default FavoriteButton; 