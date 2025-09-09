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
    
    async def update_documentation_embedding(self, db: Session, documentation_id: int) -> bool:
        """
        Update separate embeddings for a specific documentation item (title, description, content)
        
        Args:
            db: Database session
            documentation_id: ID of the documentation item to update
            
        Returns:
            True if successful, False otherwise
        """
        from ..models.documentation import Documentation
        
        try:
            # Get documentation item
            documentation = db.query(Documentation).filter(Documentation.id == documentation_id).first()
            if not documentation:
                logger.error(f"Documentation item {documentation_id} not found")
                return False
            
            # Check if embedding update is needed
            if not documentation.needs_embedding_update():
                logger.info(f"Documentation item {documentation_id} embeddings are up to date")
                return True
            
            # Prepare texts for embedding generation
            texts_to_embed = []
            field_mapping = []
            
            # Always embed title (with type context)
            title_content = documentation.get_title_content()
            texts_to_embed.append(title_content)
            field_mapping.append('title')
            
            # Embed description if present
            description_content = documentation.get_description_content()
            if description_content:
                texts_to_embed.append(description_content)
                field_mapping.append('description')
            else:
                field_mapping.append(None)
            
            # Embed content if present
            content_text = documentation.get_content_text()
            if content_text:
                texts_to_embed.append(content_text)
                field_mapping.append('content')
            else:
                field_mapping.append(None)
            
            # Generate embeddings in batch
            embeddings = await self.generate_embeddings_batch(texts_to_embed)
            
            if not embeddings or len(embeddings) == 0:
                logger.error(f"Failed to generate embeddings for documentation item {documentation_id}")
                return False
            
            # Map embeddings back to fields
            embedding_index = 0
            success = False
            
            # Title embedding (always present)
            if embedding_index < len(embeddings) and embeddings[embedding_index]:
                documentation.title_embedding = embeddings[embedding_index]
                success = True
                embedding_index += 1
            
            # Description embedding (if description exists)
            if description_content and embedding_index < len(embeddings):
                if embeddings[embedding_index]:
                    documentation.description_embedding = embeddings[embedding_index]
                embedding_index += 1
            else:
                documentation.description_embedding = None
            
            # Content embedding (if content exists)
            if content_text and embedding_index < len(embeddings):
                if embeddings[embedding_index]:
                    documentation.content_embedding = embeddings[embedding_index]
                embedding_index += 1
            else:
                documentation.content_embedding = None
            
            if success:
                documentation.embedding_updated_at = func.now()
                db.commit()
                logger.info(f"Updated separate embeddings for documentation item {documentation_id}")
                return True
            else:
                logger.error(f"Failed to generate any valid embeddings for documentation item {documentation_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating documentation embeddings {documentation_id}: {str(e)}")
            db.rollback()
            return False
    
    async def update_all_documentation_embeddings(self, db: Session, project_id: Optional[int] = None, force: bool = False) -> Dict[str, int]:
        """
        Update embeddings for all documentation items (optionally filtered by project)
        
        Args:
            db: Database session
            project_id: Optional project ID to filter documentations
            force: If True, update all embeddings regardless of update status
            
        Returns:
            Dictionary with counts of updated, failed, and skipped items
        """
        from ..models.documentation import Documentation
        
        try:
            # Build query
            query = db.query(Documentation)
            if project_id:
                query = query.filter(Documentation.project_id == project_id)
            
            documentations = query.all()
            
            updated_count = 0
            failed_count = 0
            skipped_count = 0
            
            for documentation in documentations:
                try:
                    # Check if update is needed (unless forced)
                    if not force and not documentation.needs_embedding_update():
                        skipped_count += 1
                        continue
                    
                    # Update separate embeddings for this documentation
                    success = await self.update_documentation_embedding(db, documentation.id)
                    
                    if success:
                        updated_count += 1
                    else:
                        failed_count += 1
                        
                except Exception as e:
                    logger.error(f"Error updating embeddings for documentation {documentation.id}: {str(e)}")
                    failed_count += 1
            
            # Commit all changes
            if updated_count > 0:
                db.commit()
                logger.info(f"Updated embeddings for {updated_count} documentation items")
            
            return {
                "updated": updated_count,
                "failed": failed_count,
                "skipped": skipped_count
            }
            
        except Exception as e:
            logger.error(f"Error in batch documentation embedding update: {str(e)}")
            db.rollback()
            return {"updated": 0, "failed": 0, "skipped": 0}


# Global instance
embedding_service = EmbeddingService()
