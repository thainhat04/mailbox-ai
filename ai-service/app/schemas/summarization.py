from pydantic import BaseModel, Field
from typing import Optional


class SummarizeRequest(BaseModel):
    """Request schema for email summarization"""

    subject: str = Field(
        ...,
        description="Email subject line",
        min_length=1,
        max_length=500,
        examples=["Meeting Tomorrow"]
    )

    body: str = Field(
        ...,
        description="Email body content (HTML or plain text)",
        min_length=1,
        examples=["Hi team, let's meet tomorrow at 10 AM to discuss the project..."]
    )

    max_length: Optional[int] = Field(
        default=200,
        description="Maximum length of the summary in characters",
        ge=50,
        le=500,
        examples=[200]
    )


class SummarizeResponse(BaseModel):
    """Response schema for email summarization"""

    summary: str = Field(
        ...,
        description="Generated summary with emoji prefix",
        examples=["✨ AI Summary: Meeting scheduled for tomorrow at 10 AM to discuss project progress."]
    )

    model_used: str = Field(
        ...,
        description="AI model used for generation",
        examples=["gemini-1.5-flash"]
    )


class HealthResponse(BaseModel):
    """Response schema for health check"""

    status: str = Field(default="healthy")
    service: str = Field(default="AI Email Summarization Service")
    version: str
