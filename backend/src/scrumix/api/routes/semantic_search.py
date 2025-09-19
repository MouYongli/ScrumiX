"""
Semantic search routes for AI agents and advanced search functionality
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import logging

from ..core.security import get_current_user
from ..db.database import get_db
from ..crud.backlog import backlog_crud, BacklogCRUD
from ..crud.user_project import user_project_crud
from ..crud.documentation import semantic_search_documentation_by_field, semantic_search_documentation_multi_field
from ..schemas.backlog import BacklogResponse
from ..schemas.documentation import DocumentationResponse
from ..models.user import User
from ..core.embedding_service import embedding_service

logger = logging.getLogger(__name__)

router = APIRouter()


class SemanticSearchRequest(BaseModel):
    """Request model for semantic search"""
    query: str = Field(..., min_length=1, max_length=500, description="Search query")
    project_id: Optional[int] = Field(None, description="Filter by project ID")
    sprint_id: Optional[int] = Field(None, description="Filter by sprint ID")
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
    sprint_id: Optional[int] = Field(None, description="Filter by sprint ID")
    limit: int = Field(10, ge=1, le=50, description="Maximum number of results")
    semantic_weight: float = Field(0.7, ge=0.0, le=1.0, description="Weight for semantic search (used in weighted mode)")
    keyword_weight: float = Field(0.3, ge=0.0, le=1.0, description="Weight for BM25 search (used in weighted mode)")
    similarity_threshold: float = Field(0.5, ge=0.0, le=1.0, description="Minimum similarity score for semantic results")
    use_rrf: bool = Field(True, description="Use Reciprocal Rank Fusion (recommended) vs weighted scoring")


class BM25SearchRequest(BaseModel):
    """Request model for BM25 keyword search"""
    query: str = Field(..., min_length=1, max_length=500, description="Search query")
    project_id: Optional[int] = Field(None, description="Filter by project ID")
    sprint_id: Optional[int] = Field(None, description="Filter by sprint ID")
    limit: int = Field(10, ge=1, le=50, description="Maximum number of results")


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


@router.post("/bm25-search", response_model=List[SemanticSearchResult])
async def bm25_search_backlogs(
    request: BM25SearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Perform BM25 keyword search on backlog items.
    Uses industry-standard BM25 algorithm for precise keyword matching.
    Perfect for finding items with specific terms like "login", "payment", "API".
    """
    try:
        results = await backlog_crud.bm25_search(
            db=db,
            query=request.query,
            project_id=request.project_id,
            limit=request.limit
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
            detail=f"BM25 search failed: {str(e)}"
        )


@router.post("/hybrid-search", response_model=List[SemanticSearchResult])
async def hybrid_search_backlogs(
    request: HybridSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Perform hybrid search combining semantic embeddings with BM25 keyword search.
    
    Two modes available:
    1. RRF (Reciprocal Rank Fusion) - Industry standard, recommended for production
    2. Weighted scoring - Legacy mode with configurable weights
    
    RRF combines rankings from both semantic and BM25 search using the formula:
    RRF Score = Σ(1 / (k + rank_i)) for all rankings where item appears
    
    This approach avoids the "authentication" vs "login" problem by combining
    semantic understanding with precise keyword matching.
    """
    try:
        # Validate weights sum to 1.0 only in weighted mode
        if not request.use_rrf and abs(request.semantic_weight + request.keyword_weight - 1.0) > 0.001:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Semantic weight and keyword weight must sum to 1.0 when use_rrf=False"
            )
        
        results = await backlog_crud.hybrid_search(
            db=db,
            query=request.query,
            project_id=request.project_id,
            limit=request.limit,
            semantic_weight=request.semantic_weight,
            keyword_weight=request.keyword_weight,
            similarity_threshold=request.similarity_threshold,
            use_rrf=request.use_rrf
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


# Sprint-specific semantic search endpoints

@router.post("/sprint-backlog")
async def semantic_search_sprint_backlog(
    request: SemanticSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Semantic search within a specific sprint's backlog items.
    """
    try:
        if not request.sprint_id:
            raise HTTPException(status_code=400, detail="Sprint ID is required for sprint backlog search")
        
        backlog_crud = BacklogCRUD()
        
        # Verify sprint exists and user has access
        from ..models.sprint import Sprint
        sprint = db.query(Sprint).filter(Sprint.id == request.sprint_id).first()
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        if not user_project_crud.check_user_access(db, user_id=current_user.id, project_id=sprint.project_id):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Perform semantic search within sprint
        results = await backlog_crud.semantic_search(
            db=db,
            query=request.query,
            project_id=sprint.project_id,
            sprint_id=request.sprint_id,
            limit=request.limit
        )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in sprint backlog semantic search: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/sprint-backlog/bm25")
async def bm25_search_sprint_backlog(
    request: BM25SearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    BM25 keyword search within a specific sprint's backlog items.
    """
    try:
        if not request.sprint_id:
            raise HTTPException(status_code=400, detail="Sprint ID is required for sprint backlog search")
        
        backlog_crud = BacklogCRUD()
        
        # Verify sprint exists and user has access
        from ..models.sprint import Sprint
        sprint = db.query(Sprint).filter(Sprint.id == request.sprint_id).first()
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        if not user_project_crud.check_user_access(db, user_id=current_user.id, project_id=sprint.project_id):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Perform BM25 search within sprint
        results = await backlog_crud.bm25_search(
            db=db,
            query=request.query,
            project_id=sprint.project_id,
            sprint_id=request.sprint_id,
            limit=request.limit
        )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in sprint backlog BM25 search: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/sprint-backlog/hybrid")
async def hybrid_search_sprint_backlog(
    request: HybridSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Hybrid search (semantic + BM25) within a specific sprint's backlog items.
    """
    try:
        if not request.sprint_id:
            raise HTTPException(status_code=400, detail="Sprint ID is required for sprint backlog search")
        
        backlog_crud = BacklogCRUD()
        
        # Verify sprint exists and user has access
        from ..models.sprint import Sprint
        sprint = db.query(Sprint).filter(Sprint.id == request.sprint_id).first()
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        if not user_project_crud.check_user_access(db, user_id=current_user.id, project_id=sprint.project_id):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Perform hybrid search within sprint
        results = await backlog_crud.hybrid_search(
            db=db,
            query=request.query,
            project_id=sprint.project_id,
            sprint_id=request.sprint_id,
            semantic_weight=request.semantic_weight,
            keyword_weight=request.keyword_weight,
            use_rrf=request.use_rrf,
            limit=request.limit
        )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in sprint backlog hybrid search: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Sprint semantic search endpoint

@router.post("/sprints")
async def semantic_search_sprints(
    request: SemanticSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Semantic search for sprints by name, goal, and metadata.
    """
    try:
        # Import Sprint model
        from ..models.sprint import Sprint
        
        # Get sprints with optional project filtering
        query = db.query(Sprint)
        
        if request.project_id:
            # Verify project access
            if not user_project_crud.check_user_access(db, user_id=current_user.id, project_id=request.project_id):
                raise HTTPException(status_code=403, detail="Access denied to this project")
            query = query.filter(Sprint.project_id == request.project_id)
        else:
            # If no project specified, only show sprints from projects user has access to
            from ..models.user_project import UserProject
            accessible_project_ids = db.query(UserProject.project_id).filter(
                UserProject.user_id == current_user.id
            ).subquery()
            query = query.filter(Sprint.project_id.in_(accessible_project_ids))
        
        sprints = query.limit(1000).all()  # Get all accessible sprints for search
        
        if not sprints:
            return []
        
        # Prepare sprint content for embedding search
        sprint_contents = []
        for sprint in sprints:
            # Combine searchable content: name + goal
            content = f"{sprint.sprint_name or ''} {sprint.sprint_goal or ''}".strip()
            if content:
                sprint_contents.append({
                    'sprint': sprint,
                    'content': content
                })
        
        if not sprint_contents:
            return []
        
        # Generate query embedding
        query_embedding = await embedding_service.generate_embedding(request.query)
        if not query_embedding:
            raise HTTPException(status_code=500, detail="Failed to generate search embedding")
        
        # Calculate similarities
        results = []
        for item in sprint_contents:
            # Generate content embedding
            content_embedding = await embedding_service.generate_embedding(item['content'])
            if content_embedding:
                # Calculate cosine similarity
                similarity = embedding_service.calculate_cosine_similarity(query_embedding, content_embedding)
                if similarity >= 0.3:  # Minimum threshold for sprint search
                    results.append({
                        'sprint': item['sprint'],
                        'similarity_score': similarity
                    })
        
        # Sort by similarity score
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        # Limit results
        results = results[:request.limit]
        
        # Format response
        formatted_results = []
        for result in results:
            sprint = result['sprint']
            formatted_results.append({
                'sprint': {
                    'id': sprint.id,
                    'name': sprint.sprint_name,
                    'sprint_name': sprint.sprint_name,
                    'goal': sprint.sprint_goal,
                    'sprint_goal': sprint.sprint_goal,
                    'status': sprint.status.value,
                    'start_date': sprint.start_date.isoformat(),
                    'end_date': sprint.end_date.isoformat(),
                    'sprint_capacity': sprint.sprint_capacity,
                    'project_id': sprint.project_id,
                    'created_at': sprint.created_at.isoformat(),
                    'updated_at': sprint.updated_at.isoformat()
                },
                'similarity_score': result['similarity_score']
            })
        
        return formatted_results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in sprint semantic search: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/sprints/{sprint_id}/similar")
async def find_similar_sprints(
    sprint_id: int,
    limit: int = Query(5, ge=1, le=10, description="Maximum number of similar sprints"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Find sprints similar to a given sprint based on semantic similarity.
    Useful for AI agents to discover sprints with similar goals or themes.
    """
    try:
        from ..models.sprint import Sprint
        
        # Get the source sprint
        source_sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if not source_sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        # Check user access to the project
        if not user_project_crud.check_user_access(db, user_id=current_user.id, project_id=source_sprint.project_id):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Get all other sprints from the same project (excluding the source sprint)
        other_sprints = db.query(Sprint).filter(
            Sprint.project_id == source_sprint.project_id,
            Sprint.id != sprint_id
        ).all()
        
        if not other_sprints:
            return {
                "source_sprint": {
                    "id": source_sprint.id,
                    "sprint_name": source_sprint.sprint_name,
                    "sprint_goal": source_sprint.sprint_goal,
                    "status": source_sprint.status.value,
                    "start_date": source_sprint.start_date.isoformat(),
                    "end_date": source_sprint.end_date.isoformat(),
                    "sprint_capacity": source_sprint.sprint_capacity,
                    "project_id": source_sprint.project_id
                },
                "similar_sprints": []
            }
        
        # Prepare source sprint content for embedding
        source_content = f"{source_sprint.sprint_name or ''} {source_sprint.sprint_goal or ''}".strip()
        if not source_content:
            return {
                "source_sprint": {
                    "id": source_sprint.id,
                    "sprint_name": source_sprint.sprint_name,
                    "sprint_goal": source_sprint.sprint_goal,
                    "status": source_sprint.status.value,
                    "start_date": source_sprint.start_date.isoformat(),
                    "end_date": source_sprint.end_date.isoformat(),
                    "sprint_capacity": source_sprint.sprint_capacity,
                    "project_id": source_sprint.project_id
                },
                "similar_sprints": []
            }
        
        # Generate source embedding
        source_embedding = await embedding_service.generate_embedding(source_content)
        if not source_embedding:
            raise HTTPException(status_code=500, detail="Failed to generate source sprint embedding")
        
        # Calculate similarities with other sprints
        similarities = []
        for sprint in other_sprints:
            # Prepare sprint content for embedding
            content = f"{sprint.sprint_name or ''} {sprint.sprint_goal or ''}".strip()
            if content:
                # Generate content embedding
                content_embedding = await embedding_service.generate_embedding(content)
                if content_embedding:
                    # Calculate cosine similarity
                    similarity = embedding_service.calculate_cosine_similarity(source_embedding, content_embedding)
                    if similarity >= 0.5:  # Minimum threshold for sprint similarity
                        similarities.append({
                            'sprint': sprint,
                            'similarity': similarity
                        })
        
        # Sort by similarity score
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        
        # Limit results
        similarities = similarities[:limit]
        
        # Format response
        similar_sprints = []
        for item in similarities:
            sprint = item['sprint']
            similar_sprints.append({
                'id': sprint.id,
                'sprint_name': sprint.sprint_name,
                'sprint_goal': sprint.sprint_goal,
                'status': sprint.status.value,
                'start_date': sprint.start_date.isoformat(),
                'end_date': sprint.end_date.isoformat(),
                'sprint_capacity': sprint.sprint_capacity,
                'project_id': sprint.project_id,
                'created_at': sprint.created_at.isoformat(),
                'updated_at': sprint.updated_at.isoformat(),
                'similarity': item['similarity']
            })
        
        return {
            "source_sprint": {
                "id": source_sprint.id,
                "sprint_name": source_sprint.sprint_name,
                "sprint_goal": source_sprint.sprint_goal,
                "status": source_sprint.status.value,
                "start_date": source_sprint.start_date.isoformat(),
                "end_date": source_sprint.end_date.isoformat(),
                "sprint_capacity": source_sprint.sprint_capacity,
                "project_id": source_sprint.project_id,
                "created_at": source_sprint.created_at.isoformat(),
                "updated_at": source_sprint.updated_at.isoformat()
            },
            "similar_sprints": similar_sprints
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finding similar sprints: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")