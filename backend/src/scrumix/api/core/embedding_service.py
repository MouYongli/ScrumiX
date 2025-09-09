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
    
    async def update_acceptance_criteria_embedding(self, db: Session, criteria_id: int) -> bool:
        """
        Update embedding for a specific acceptance criteria
        
        Args:
            db: Database session
            criteria_id: ID of the criteria to update
            
        Returns:
            True if successful, False otherwise
        """
        from ..models.acceptance_criteria import AcceptanceCriteria
        
        try:
            # Get acceptance criteria
            criteria = db.query(AcceptanceCriteria).filter(AcceptanceCriteria.id == criteria_id).first()
            if not criteria:
                logger.error(f"Acceptance criteria {criteria_id} not found")
                return False
            
            # Check if embedding update is needed
            if not criteria.needs_embedding_update():
                logger.info(f"Acceptance criteria {criteria_id} embedding is up to date")
                return True
            
            # Generate embedding for searchable content
            searchable_content = criteria.get_searchable_content()
            embedding = await self.generate_embedding(searchable_content)
            
            if embedding:
                criteria.embedding = embedding
                criteria.embedding_updated_at = func.now()
                db.commit()
                logger.info(f"Updated embedding for acceptance criteria {criteria_id}")
                return True
            else:
                logger.error(f"Failed to generate embedding for acceptance criteria {criteria_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating acceptance criteria embedding {criteria_id}: {str(e)}")
            db.rollback()
            return False
    
    async def update_all_acceptance_criteria_embeddings(
        self, 
        db: Session, 
        backlog_id: Optional[int] = None,
        force: bool = False
    ) -> Dict[str, int]:
        """
        Update embeddings for all acceptance criteria (optionally filtered by backlog)
        
        Args:
            db: Database session
            backlog_id: Optional backlog ID to filter criteria
            force: If True, update all embeddings regardless of update status
            
        Returns:
            Dictionary with counts of updated, failed, and skipped items
        """
        from ..models.acceptance_criteria import AcceptanceCriteria
        
        try:
            # Build query
            query = db.query(AcceptanceCriteria)
            
            # Apply backlog filter
            if backlog_id:
                query = query.filter(AcceptanceCriteria.backlog_id == backlog_id)
            
            criteria_list = query.all()
            
            updated_count = 0
            failed_count = 0
            skipped_count = 0
            
            for criteria in criteria_list:
                try:
                    # Check if update is needed (unless forced)
                    if not force and not criteria.needs_embedding_update():
                        skipped_count += 1
                        continue
                    
                    # Generate embedding for searchable content
                    searchable_content = criteria.get_searchable_content()
                    embedding = await self.generate_embedding(searchable_content)
                    
                    if embedding:
                        criteria.embedding = embedding
                        criteria.embedding_updated_at = func.now()
                        updated_count += 1
                    else:
                        failed_count += 1
                        
                except Exception as e:
                    logger.error(f"Error updating embedding for acceptance criteria {criteria.id}: {str(e)}")
                    failed_count += 1
            
            # Commit all changes
            if updated_count > 0:
                db.commit()
                logger.info(f"Updated embeddings for {updated_count} acceptance criteria")
            
            return {
                "updated": updated_count,
                "failed": failed_count,
                "skipped": skipped_count
            }
            
        except Exception as e:
            logger.error(f"Error in batch acceptance criteria embedding update: {str(e)}")
            db.rollback()
            return {"updated": 0, "failed": 0, "skipped": 0}
    
    async def update_project_embedding(self, db: Session, project_id: int) -> bool:
        """
        Update embedding for a specific project
        
        Args:
            db: Database session
            project_id: ID of the project to update
            
        Returns:
            True if successful, False otherwise
        """
        from ..models.project import Project
        
        try:
            # Get project
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                logger.error(f"Project {project_id} not found")
                return False
            
            # Check if embedding update is needed
            if not project.needs_embedding_update():
                logger.info(f"Project {project_id} embedding is up to date")
                return True
            
            # Generate embedding for searchable content
            searchable_content = project.get_searchable_content()
            embedding = await self.generate_embedding(searchable_content)
            
            if embedding:
                project.embedding = embedding
                project.embedding_updated_at = func.now()
                db.commit()
                logger.info(f"Updated embedding for project {project_id}")
                return True
            else:
                logger.error(f"Failed to generate embedding for project {project_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating project embedding {project_id}: {str(e)}")
            db.rollback()
            return False
    
    async def update_all_project_embeddings(
        self, 
        db: Session, 
        user_id: Optional[int] = None,
        force: bool = False
    ) -> Dict[str, int]:
        """
        Update embeddings for all projects (optionally filtered by user membership)
        
        Args:
            db: Database session
            user_id: Optional user ID to filter projects by membership
            force: If True, update all embeddings regardless of update status
            
        Returns:
            Dictionary with counts of updated, failed, and skipped items
        """
        from ..models.project import Project
        from ..models.user_project import UserProject
        
        try:
            # Build query
            query = db.query(Project)
            
            # Apply user membership filter
            if user_id:
                query = query.join(UserProject).filter(UserProject.user_id == user_id)
            
            projects = query.all()
            
            updated_count = 0
            failed_count = 0
            skipped_count = 0
            
            for project in projects:
                try:
                    # Check if update is needed (unless forced)
                    if not force and not project.needs_embedding_update():
                        skipped_count += 1
                        continue
                    
                    # Generate embedding for searchable content
                    searchable_content = project.get_searchable_content()
                    embedding = await self.generate_embedding(searchable_content)
                    
                    if embedding:
                        project.embedding = embedding
                        project.embedding_updated_at = func.now()
                        updated_count += 1
                    else:
                        failed_count += 1
                        
                except Exception as e:
                    logger.error(f"Error updating embedding for project {project.id}: {str(e)}")
                    failed_count += 1
            
            # Commit all changes
            if updated_count > 0:
                db.commit()
                logger.info(f"Updated embeddings for {updated_count} projects")
            
            return {
                "updated": updated_count,
                "failed": failed_count,
                "skipped": skipped_count
            }
            
        except Exception as e:
            logger.error(f"Error in batch project embedding update: {str(e)}")
            db.rollback()
            return {"updated": 0, "failed": 0, "skipped": 0}


# Global instance
embedding_service = EmbeddingService()
