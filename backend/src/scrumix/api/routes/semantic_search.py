"""
Semantic search routes for AI agents and advanced search functionality
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ..core.security import get_current_user
from ..db.database import get_db
from ..crud.backlog import backlog_crud
from ..crud.documentation import semantic_search_documentation_by_field, semantic_search_documentation_multi_field
from ..schemas.backlog import BacklogResponse
from ..schemas.documentation import DocumentationResponse
from ..models.user import User
from ..core.embedding_service import embedding_service

router = APIRouter()


class SemanticSearchRequest(BaseModel):
    """Request model for semantic search"""
    query: str = Field(..., min_length=1, max_length=500, description="Search query")
    project_id: Optional[int] = Field(None, description="Filter by project ID")
    limit: int = Field(10, ge=1, le=50, description="Maximum number of results")
    similarity_threshold: float = Field(0.7, ge=0.0, le=1.0, description="Minimum similarity score")


class SemanticSearchResult(BaseModel):
    """Result model for semantic search"""
    backlog: BacklogResponse
    similarity_score: float = Field(..., description="Similarity score between 0 and 1")


class HybridSearchRequest(BaseModel):
    """Request model for hybrid search"""
    query: str = Field(..., min_length=1, max_length=500, description="Search query")
    project_id: Optional[int] = Field(None, description="Filter by project ID")
    limit: int = Field(10, ge=1, le=50, description="Maximum number of results")
    semantic_weight: float = Field(0.7, ge=0.0, le=1.0, description="Weight for semantic search")
    keyword_weight: float = Field(0.3, ge=0.0, le=1.0, description="Weight for keyword search")
    similarity_threshold: float = Field(0.5, ge=0.0, le=1.0, description="Minimum similarity score")


class EmbeddingUpdateRequest(BaseModel):
    """Request model for embedding updates"""
    project_id: Optional[int] = Field(None, description="Filter by project ID")
    force: bool = Field(False, description="Force update all embeddings")


class EmbeddingUpdateResponse(BaseModel):
    """Response model for embedding updates"""
    updated: int = Field(..., description="Number of embeddings updated")
    failed: int = Field(..., description="Number of failed updates")
    skipped: int = Field(..., description="Number of skipped updates")
    message: str = Field(..., description="Status message")


@router.post("/semantic-search", response_model=List[SemanticSearchResult])
async def semantic_search_backlogs(
    request: SemanticSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Perform semantic search on backlog items using vector embeddings.
    Ideal for AI agents to find relevant backlog items based on natural language queries.
    """
    try:
        results = await backlog_crud.semantic_search(
            db=db,
            query=request.query,
            project_id=request.project_id,
            limit=request.limit,
            similarity_threshold=request.similarity_threshold
        )
        
        return [
            SemanticSearchResult(
                backlog=BacklogResponse.model_validate(backlog),
                similarity_score=score
            )
            for backlog, score in results
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic search failed: {str(e)}"
        )


@router.post("/hybrid-search", response_model=List[SemanticSearchResult])
async def hybrid_search_backlogs(
    request: HybridSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Perform hybrid search combining semantic and keyword search.
    Best for comprehensive search that combines AI understanding with traditional text matching.
    """
    try:
        # Validate weights sum to 1.0
        if abs(request.semantic_weight + request.keyword_weight - 1.0) > 0.001:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Semantic weight and keyword weight must sum to 1.0"
            )
        
        results = await backlog_crud.hybrid_search(
            db=db,
            query=request.query,
            project_id=request.project_id,
            limit=request.limit,
            semantic_weight=request.semantic_weight,
            keyword_weight=request.keyword_weight,
            similarity_threshold=request.similarity_threshold
        )
        
        return [
            SemanticSearchResult(
                backlog=BacklogResponse.model_validate(backlog),
                similarity_score=score
            )
            for backlog, score in results
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Hybrid search failed: {str(e)}"
        )


@router.get("/similar/{backlog_id}", response_model=List[SemanticSearchResult])
async def find_similar_backlogs(
    backlog_id: int,
    limit: int = Query(5, ge=1, le=20, description="Maximum number of similar items"),
    similarity_threshold: float = Query(0.6, ge=0.0, le=1.0, description="Minimum similarity score"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Find backlog items similar to a given backlog item.
    Useful for AI agents to discover related work items or suggest similar tasks.
    """
    try:
        results = await backlog_crud.find_similar_backlogs(
            db=db,
            backlog_id=backlog_id,
            limit=limit,
            similarity_threshold=similarity_threshold
        )
        
        return [
            SemanticSearchResult(
                backlog=BacklogResponse.model_validate(backlog),
                similarity_score=score
            )
            for backlog, score in results
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Similar backlog search failed: {str(e)}"
        )


@router.post("/update-embeddings", response_model=EmbeddingUpdateResponse)
async def update_backlog_embeddings(
    request: EmbeddingUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update embeddings for backlog items.
    Should be called when backlog content changes or when setting up the system initially.
    """
    try:
        # Check if user has permission (you may want to restrict this to admins)
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can update embeddings"
            )
        
        stats = await backlog_crud.update_all_embeddings(
            db=db,
            project_id=request.project_id,
            force=request.force
        )
        
        total_processed = stats["updated"] + stats["failed"] + stats["skipped"]
        message = f"Processed {total_processed} backlog items: {stats['updated']} updated, {stats['skipped']} skipped, {stats['failed']} failed"
        
        return EmbeddingUpdateResponse(
            updated=stats["updated"],
            failed=stats["failed"],
            skipped=stats["skipped"],
            message=message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding update failed: {str(e)}"
        )


@router.post("/update-embedding/{backlog_id}")
async def update_single_backlog_embedding(
    backlog_id: int,
    force: bool = Query(False, description="Force update even if up to date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update embedding for a single backlog item.
    Useful for real-time updates when a backlog item is modified.
    """
    try:
        success = await backlog_crud.update_embedding(db=db, backlog_id=backlog_id, force=force)
        
        if success:
            return {"message": f"Successfully updated embedding for backlog {backlog_id}"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backlog item {backlog_id} not found or embedding update failed"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding update failed: {str(e)}"
        )


# New field-specific search endpoints for documentation
class DocumentationFieldSearchRequest(BaseModel):
    """Request model for field-specific documentation search"""
    query: str = Field(..., min_length=1, max_length=500, description="Search query")
    field: str = Field(..., description="Field to search in: 'title', 'description', or 'content'")
    project_id: Optional[int] = Field(None, description="Filter by project ID")
    limit: int = Field(10, ge=1, le=50, description="Maximum number of results")
    similarity_threshold: float = Field(0.7, ge=0.0, le=1.0, description="Minimum similarity score")


class DocumentationMultiFieldSearchRequest(BaseModel):
    """Request model for multi-field documentation search"""
    query: str = Field(..., min_length=1, max_length=500, description="Search query")
    fields: List[str] = Field(default=["title", "description", "content"], description="Fields to search in")
    project_id: Optional[int] = Field(None, description="Filter by project ID")
    limit: int = Field(10, ge=1, le=50, description="Maximum number of results")
    similarity_threshold: float = Field(0.7, ge=0.0, le=1.0, description="Minimum similarity score")


class DocumentationFieldSearchResult(BaseModel):
    """Result model for field-specific documentation search"""
    documentation: DocumentationResponse
    similarity_score: float = Field(..., description="Similarity score between 0 and 1")


class DocumentationMultiFieldSearchResult(BaseModel):
    """Result model for multi-field documentation search"""
    documentation: DocumentationResponse
    similarity_scores: Dict[str, float] = Field(..., description="Similarity scores for each field")


@router.post("/documentation/field-search", response_model=List[DocumentationFieldSearchResult])
async def search_documentation_by_field(
    request: DocumentationFieldSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search documentation in a specific field (title, description, or content).
    Perfect for AI agents that need targeted search capabilities.
    """
    try:
        # Validate field parameter
        valid_fields = ['title', 'description', 'content']
        if request.field not in valid_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid field '{request.field}'. Must be one of: {valid_fields}"
            )
        
        results = await semantic_search_documentation_by_field(
            db=db,
            query=request.query,
            field=request.field,
            project_id=request.project_id,
            limit=request.limit,
            similarity_threshold=request.similarity_threshold
        )

        return [
            DocumentationFieldSearchResult(
                documentation=DocumentationResponse.model_validate(doc),
                similarity_score=score
            )
            for doc, score in results
        ]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Field-specific search failed: {str(e)}"
        )


@router.post("/documentation/multi-field-search", response_model=List[DocumentationMultiFieldSearchResult])
async def search_documentation_multi_field(
    request: DocumentationMultiFieldSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search documentation across multiple fields with individual similarity scores.
    Ideal for comprehensive AI agent searches that need field-level relevance.
    """
    try:
        # Validate fields parameter
        valid_fields = ['title', 'description', 'content']
        invalid_fields = [f for f in request.fields if f not in valid_fields]
        if invalid_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid fields {invalid_fields}. Must be from: {valid_fields}"
            )
        
        results = await semantic_search_documentation_multi_field(
            db=db,
            query=request.query,
            fields=request.fields,
            project_id=request.project_id,
            limit=request.limit,
            similarity_threshold=request.similarity_threshold
        )

        return [
            DocumentationMultiFieldSearchResult(
                documentation=DocumentationResponse.model_validate(doc),
                similarity_scores=scores
            )
            for doc, scores in results
        ]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Multi-field search failed: {str(e)}"
        )