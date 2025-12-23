from fastapi import APIRouter, HTTPException
from app.schemas import VectorEmbeddingRequest, VectorEmbeddingResponse, BatchVectorEmbeddingRequest, BatchVectorEmbeddingResponse
from app.services.search_vector_service import search_vector_service

router = APIRouter()

@router.post("/search/vector/embeddings", response_model=VectorEmbeddingResponse)
async def create_vector_embedding(request: VectorEmbeddingRequest) -> VectorEmbeddingResponse:
    """
    Create a 384-dimensional vector embedding for the given text

    Uses the local sentence-transformers/all-MiniLM-L6-v2 model for embedding generation.
    This is a lightweight model optimized for semantic search and similarity tasks.

    Args:
        request: VectorEmbeddingRequest containing the text to embed (max 512 characters)

    Returns:
        VectorEmbeddingResponse with a 384-dimensional embedding vector

    Raises:
        HTTPException: If embedding generation fails
    """

    try:
        embedding = await search_vector_service.create_vector_embedding(request.text)
        print(embedding)
        return VectorEmbeddingResponse(embedding=embedding)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create vector embedding: {str(e)}")

@router.post("/search/vector/embeddings/batch", response_model=BatchVectorEmbeddingResponse)
async def create_vector_embeddings_batch(request: BatchVectorEmbeddingRequest) -> BatchVectorEmbeddingResponse:
    """
    Create 384-dimensional vector embeddings for multiple texts in batch

    Uses the local sentence-transformers/all-MiniLM-L6-v2 model for efficient batch embedding generation.
    Batch processing is optimized for performance when generating embeddings for multiple texts.

    Args:
        request: BatchVectorEmbeddingRequest containing a list of texts to embed (max 100 texts, each max 512 characters)

    Returns:
        BatchVectorEmbeddingResponse with a list of 384-dimensional embedding vectors

    Raises:
        HTTPException: If batch embedding generation fails
    """

    try:
        embeddings = await search_vector_service.create_vector_embeddings_batch(request.texts)
        return BatchVectorEmbeddingResponse(embeddings=embeddings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create batch vector embeddings: {str(e)}")
    