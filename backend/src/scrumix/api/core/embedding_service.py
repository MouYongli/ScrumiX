"""
Embedding service for generating and managing vector embeddings
"""
import os
from typing import List, Optional, Dict, Any
from openai import AsyncOpenAI
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import logging

from .config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating and managing vector embeddings using OpenAI"""
    
    def __init__(self):
        """Initialize the embedding service with OpenAI client"""
        # Support both Azure OpenAI and standard OpenAI
        self.api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AZURE_OPENAI_API_KEY")
        self.api_base = os.environ.get("AZURE_OPENAI_ENDPOINT")
        self.deployment_name = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", "text-embedding-ada-002")
        self.model = "text-embedding-ada-002"
        
        if not self.api_key:
            logger.warning("No OpenAI API key found. Embedding generation will be disabled.")
            self.client = None
            return
        
        # Initialize OpenAI client (supports both Azure and standard OpenAI)
        if self.api_base:  # Azure OpenAI
            self.client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=f"{self.api_base}/openai/deployments/{self.deployment_name}",
                api_version="2023-12-01-preview"
            )
        else:  # Standard OpenAI
            self.client = AsyncOpenAI(api_key=self.api_key)
    
    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding for given text
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            List of floats representing the embedding, or None if generation fails
        """
        if not self.client or not text.strip():
            return None
        
        try:
            # Clean and truncate text if too long (OpenAI has token limits)
            cleaned_text = text.strip()
            if len(cleaned_text) > 8000:  # Conservative limit for token count
                cleaned_text = cleaned_text[:8000] + "..."
            
            response = await self.client.embeddings.create(
                input=cleaned_text,
                model=self.model
            )
            
            if response.data and len(response.data) > 0:
                return response.data[0].embedding
            
        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            return None
        
        return None
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        Generate embeddings for multiple texts in batch
        
        Args:
            texts: List of texts to generate embeddings for
            
        Returns:
            List of embeddings (or None for failed generations)
        """
        if not self.client or not texts:
            return [None] * len(texts)
        
        try:
            # Clean texts and filter out empty ones
            cleaned_texts = []
            text_indices = []
            
            for i, text in enumerate(texts):
                cleaned = text.strip() if text else ""
                if cleaned:
                    if len(cleaned) > 8000:
                        cleaned = cleaned[:8000] + "..."
                    cleaned_texts.append(cleaned)
                    text_indices.append(i)
            
            if not cleaned_texts:
                return [None] * len(texts)
            
            response = await self.client.embeddings.create(
                input=cleaned_texts,
                model=self.model
            )
            
            # Map results back to original order
            results = [None] * len(texts)
            for i, embedding_data in enumerate(response.data):
                original_index = text_indices[i]
                results[original_index] = embedding_data.embedding
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {str(e)}")
            return [None] * len(texts)
    
    async def update_backlog_embedding(self, db: Session, backlog_id: int) -> bool:
        """
        Update embedding for a specific backlog item
        
        Args:
            db: Database session
            backlog_id: ID of the backlog item to update
            
        Returns:
            True if successful, False otherwise
        """
        from ..models.backlog import Backlog
        
        try:
            # Get backlog item with acceptance criteria
            backlog = db.query(Backlog).filter(Backlog.id == backlog_id).first()
            if not backlog:
                logger.error(f"Backlog item {backlog_id} not found")
                return False
            
            # Check if embedding update is needed
            if not backlog.needs_embedding_update():
                logger.info(f"Backlog item {backlog_id} embedding is up to date")
                return True
            
            # Generate embedding for searchable content
            searchable_content = backlog.get_searchable_content()
            embedding = await self.generate_embedding(searchable_content)
            
            if embedding:
                backlog.embedding = embedding
                backlog.embedding_updated_at = func.now()
                db.commit()
                logger.info(f"Updated embedding for backlog item {backlog_id}")
                return True
            else:
                logger.error(f"Failed to generate embedding for backlog item {backlog_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating backlog embedding {backlog_id}: {str(e)}")
            db.rollback()
            return False
    
    async def update_all_backlog_embeddings(self, db: Session, project_id: Optional[int] = None, force: bool = False) -> Dict[str, int]:
        """
        Update embeddings for all backlog items (optionally filtered by project)
        
        Args:
            db: Database session
            project_id: Optional project ID to filter backlogs
            force: If True, update all embeddings regardless of update status
            
        Returns:
            Dictionary with counts of updated, failed, and skipped items
        """
        from ..models.backlog import Backlog
        
        try:
            # Build query
            query = db.query(Backlog)
            if project_id:
                query = query.filter(Backlog.project_id == project_id)
            
            backlogs = query.all()
            
            updated_count = 0
            failed_count = 0
            skipped_count = 0
            
            for backlog in backlogs:
                try:
                    # Check if update is needed (unless forced)
                    if not force and not backlog.needs_embedding_update():
                        skipped_count += 1
                        continue
                    
                    # Generate embedding
                    searchable_content = backlog.get_searchable_content()
                    embedding = await self.generate_embedding(searchable_content)
                    
                    if embedding:
                        backlog.embedding = embedding
                        backlog.embedding_updated_at = func.now()
                        updated_count += 1
                    else:
                        failed_count += 1
                        
                except Exception as e:
                    logger.error(f"Error updating embedding for backlog {backlog.id}: {str(e)}")
                    failed_count += 1
            
            # Commit all changes
            if updated_count > 0:
                db.commit()
                logger.info(f"Updated embeddings for {updated_count} backlog items")
            
            return {
                "updated": updated_count,
                "failed": failed_count,
                "skipped": skipped_count
            }
            
        except Exception as e:
            logger.error(f"Error in batch embedding update: {str(e)}")
            db.rollback()
            return {"updated": 0, "failed": 0, "skipped": 0}


# Global instance
embedding_service = EmbeddingService()
