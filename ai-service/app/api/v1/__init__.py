from fastapi import APIRouter
from app.api.v1.endpoints import summarization, search_vector

api_router = APIRouter()

# Include summarization endpoints
api_router.include_router(
    summarization.router,
    tags=["summarization"]
)

# Include search vector endpoints
api_router.include_router(
    search_vector.router,
    tags=["search-vector"]
)
