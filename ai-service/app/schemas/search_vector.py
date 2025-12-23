from pydantic import BaseModel, Field, field_validator

class VectorEmbeddingRequest(BaseModel):
    """Request schema for vector embedding using all-MiniLM-L6-v2 model"""
    text: str = Field(
        ...,
        description="The text to embed",
        min_length=1,
        max_length=512,
        examples=["Hello, world!", "This is a test text"]
    )

class VectorEmbeddingResponse(BaseModel):
    """Response schema for vector embedding

    Returns a 384-dimensional embedding vector from the all-MiniLM-L6-v2 model
    """
    embedding: list[float] = Field(
        ...,
        description="The 384-dimensional embedding vector of the text",
        examples=[[0.1, 0.2, 0.3]]
    )

    @field_validator('embedding')
    @classmethod
    def validate_embedding_dimension(cls, v):
        if len(v) != 384:
            raise ValueError(f'Embedding must be 384-dimensional, got {len(v)} dimensions')
        return v

class BatchVectorEmbeddingRequest(BaseModel):
    """Request schema for batch vector embedding using all-MiniLM-L6-v2 model"""
    texts: list[str] = Field(
        ...,
        description="List of texts to embed (each text max 512 characters)",
        min_length=1,
        max_length=100
    )

class BatchVectorEmbeddingResponse(BaseModel):
    """Response schema for batch vector embedding

    Returns a list of 384-dimensional embedding vectors from the all-MiniLM-L6-v2 model
    """
    embeddings: list[list[float]] = Field(
        ...,
        description="List of 384-dimensional embedding vectors for the texts"
    )

    @field_validator('embeddings')
    @classmethod
    def validate_embeddings_dimension(cls, v):
        for i, embedding in enumerate(v):
            if embedding and len(embedding) != 384:
                raise ValueError(f'Embedding at index {i} must be 384-dimensional, got {len(embedding)} dimensions')
        return v

class HealthResponse(BaseModel):
    """Response schema for health check"""
    status: str = Field(default="healthy")
    service: str = Field(default="AI Search Vector Service")
    version: str = Field(default="1.0.0")