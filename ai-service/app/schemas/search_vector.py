from pydantic import BaseModel, Field 

class VectorEmbeddingRequest(BaseModel):
    """Request schema for vector embedding"""
    text: str = Field(..., description="The text to embed", min_length=1, max_length=1000, examples=["Hello, world!", "This is a test text"])

class VectorEmbeddingResponse(BaseModel):
    """Response schema for vector embedding"""
    embedding: list[float] = Field(..., description="The embedding of the text", examples=[[0.1, 0.2, 0.3]])
    
class HealthResponse(BaseModel):
    """Response schema for health check"""
    status: str = Field(default="healthy")
    service: str = Field(default="AI Search Vector Service")
    version: str = Field(default="1.0.0")