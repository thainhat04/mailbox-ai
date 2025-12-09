from fastapi import APIRouter
from app.api.v1.endpoints import summarization

api_router = APIRouter()

# Include summarization endpoints
api_router.include_router(
    summarization.router,
    tags=["summarization"]
)
