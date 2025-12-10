from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.core.config import settings
import re


class SummarizationService:
    """Service for generating email summaries using Gemini via LangChain"""

    def __init__(self):
        # Initialize Gemini model via LangChain
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=settings.TEMPERATURE,
        )

        # Create summarization prompt template
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert email summarization assistant. Your task is to create concise,
informative summaries of email content that help users quickly understand the key points.

Guidelines:
- Focus on the main message, action items, and important details
- Keep summaries under {max_length} characters
- Use clear, professional language
- Avoid unnecessary filler words
- Capture the essence and purpose of the email
- Do not include greetings or signatures in the summary
- If the email contains a question, include it in the summary
- If there are action items or deadlines, prioritize them"""),
            ("user", """Email Subject: {subject}

Email Body:
{body}

Generate a concise summary:""")
        ])

        # Create the chain: prompt -> LLM -> output parser
        self.chain = self.prompt | self.llm | StrOutputParser()

    def clean_text(self, text: str) -> str:
        """Clean and normalize text content"""
        if not text:
            return ""

        # Remove HTML tags
        text = re.sub(r'<[^>]*>', '', text)

        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)

        # Remove common email signatures and footers
        text = re.sub(r'(Sent from|Get Outlook|--\s)', '', text, flags=re.IGNORECASE)

        return text.strip()

    async def generate_summary(
        self,
        subject: str,
        body: str,
        max_length: int = None
    ) -> str:
        """
        Generate a summary for an email using Gemini via LangChain

        Args:
            subject: Email subject line
            body: Email body content (can be HTML or plain text)
            max_length: Maximum length of summary (defaults to settings)

        Returns:
            Generated summary string with emoji prefix
        """
        # Use configured max length if not specified
        if max_length is None:
            max_length = settings.MAX_SUMMARY_LENGTH

        # Clean the text content
        clean_body = self.clean_text(body)
        clean_subject = self.clean_text(subject)

        # Handle empty content
        if not clean_body or len(clean_body) < 20:
            return f"✨ AI Summary: {clean_subject or 'No content available'}"

        try:
            # Generate summary using LangChain chain
            summary = await self.chain.ainvoke({
                "subject": clean_subject,
                "body": clean_body[:2000],  # Limit input to avoid token limits
                "max_length": max_length
            })

            # Clean up the generated summary
            summary = summary.strip()

            # Ensure it fits within max length
            if len(summary) > max_length:
                summary = summary[:max_length - 3] + "..."

            # Add emoji prefix to match existing format
            return f"✨ AI Summary: {summary}"

        except Exception as e:
            # Fallback to extractive summary if AI fails
            print(f"Error generating AI summary: {e}")
            import traceback
            traceback.print_exc()
            return self._fallback_summary(clean_subject, clean_body, max_length)

    def _fallback_summary(self, subject: str, body: str, max_length: int) -> str:
        """Fallback extractive summary if AI fails"""
        # Extract first 2-3 sentences
        sentences = re.findall(r'[^.!?]+[.!?]+', body)

        if len(sentences) >= 2:
            extracted = ' '.join(sentences[:2])
        else:
            extracted = body[:150]

        # Ensure max length
        if len(extracted) > max_length:
            extracted = extracted[:max_length - 3] + "..."

        return f"✨ AI Summary: {extracted}"


# Singleton instance
summarization_service = SummarizationService()
