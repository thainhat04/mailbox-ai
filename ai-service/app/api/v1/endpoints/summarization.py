from fastapi import APIRouter, HTTPException
from app.schemas import SummarizeRequest, SummarizeResponse
from app.services.summarization_service import summarization_service
from app.core.config import settings

router = APIRouter()


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_email(request: SummarizeRequest) -> SummarizeResponse:
    """
    Generate a concise AI summary of an email

    - **subject**: Email subject line
    - **body**: Email body content (HTML or plain text)
    - **max_length**: Optional maximum length (default: 200 characters)

    Returns a summary with emoji prefix matching the existing format.
    """
    try:
        summary = await summarization_service.generate_summary(
            subject=request.subject,
            body=request.body,
            max_length=request.max_length
        )

        return SummarizeResponse(
            summary=summary,
            model_used=settings.GEMINI_MODEL
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}"
        )
