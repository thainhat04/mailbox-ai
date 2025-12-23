from fastapi import APIRouter, HTTPException
from app.schemas import VectorEmbeddingRequest, VectorEmbeddingResponse
from app.services.search_vector_service import search_vector_service

router = APIRouter()

@router.post("/search/vector/embeddings", response_model=VectorEmbeddingResponse)
async def create_vector_embedding(request: VectorEmbeddingRequest) -> VectorEmbeddingResponse:
    """
    Create a vector embedding for the given text
    """
    
    try: 
        embedding = await search_vector_service.create_vector_embedding(request.text)
        print(embedding)
        return VectorEmbeddingResponse(embedding=embedding)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create vector embedding: {str(e)}")


