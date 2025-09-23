"""
Vector utilities with graceful degradation for pgvector
"""
import os
from typing import Optional, Any
from sqlalchemy import Column

# Check if pgvector is available
try:
    from pgvector.sqlalchemy import Vector
    PGVECTOR_AVAILABLE = True
    print("pgvector extension is available")
except ImportError:
    PGVECTOR_AVAILABLE = False
    print("pgvector extension not available, using fallback")
    
    # Create a fallback Vector class that behaves like pgvector but uses JSON
    class Vector:
        def __init__(self, dimensions: int):
            self.dimensions = dimensions
        
        def __call__(self, *args, **kwargs):
            # Return a JSON column as fallback
            from sqlalchemy import JSON
            return JSON()

def get_vector_column(dimensions: int = 1536) -> Column:
    """
    Get a vector column with graceful degradation
    Returns pgvector.Vector if available, otherwise returns JSON column
    """
    if PGVECTOR_AVAILABLE:
        return Vector(dimensions)
    else:
        from sqlalchemy import JSON
        return JSON()

def is_pgvector_available() -> bool:
    """Check if pgvector is available"""
    return PGVECTOR_AVAILABLE

def get_embedding_dimensions() -> int:
    """Get the embedding dimensions (1536 for OpenAI embeddings)"""
    return 1536
