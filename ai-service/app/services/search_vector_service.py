from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings
import re
import json


class SearchVectorService:
    """Service for searching vectors using Gemini via LangChain"""

    def __init__(self):
        # Initialize Gemini model via LangChain
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=settings.TEMPERATURE,
        )


        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful assistant that generates vector embeddings. 
            Your task is to create a vector embedding (a list of floating-point numbers) for the given text.
            
            IMPORTANT: You must output ONLY a valid JSON array of numbers, nothing else. No explanations, no markdown, no code blocks.
            Example format: [0.1, 0.2, 0.3, 0.4, ...]
            The array should contain at least 10 numbers and represent the semantic meaning of the text.
            """),
            ("user", "Create a vector embedding for this text: {text}\n\nOutput only the JSON array:")
        ])

        # Use raw output and parse manually since JsonOutputParser may not handle arrays well
        self.chain = self.prompt | self.llm


    def clean_text(self, text: str) -> str:
        """Clean the text to remove HTML tags and excessive whitespace"""
        if text is None:
            return ""
        text = re.sub(r'<[^>]*>', '', text)
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'(Sent from|Get Outlook|--\s)', '', text, flags=re.IGNORECASE)
        return text.strip()

    async def create_vector_embedding(self, text: str, max_length: int = 1000) -> list[float]:
        """Create a vector embedding for the given text"""
        if max_length is None:
            max_length = settings.MAX_SUMMARY_LENGTH

        clean_text = self.clean_text(text)

        try: 
            # Get raw output from LLM
            result = await self.chain.ainvoke({
                "text": clean_text[:max_length]
            })

            # Extract content from AIMessage if it's a message object
            if hasattr(result, 'content'):
                content = result.content
            elif isinstance(result, str):
                content = result
            else:
                content = str(result)
            
            # Clean the content - remove markdown code blocks if present
            original_content = content
            content = content.strip()
            if content.startswith("```"):
                # Remove markdown code blocks
                lines = content.split("\n")
                content = "\n".join(lines[1:-1]) if len(lines) > 2 else content
            if content.startswith("```json"):
                lines = content.split("\n")
                content = "\n".join(lines[1:-1]) if len(lines) > 2 else content
            
            
            # Parse JSON
            parsed = json.loads(content.strip())
            
            # Handle different response formats
            if isinstance(parsed, list):
                # Ensure all elements are floats
                embedding = [float(x) for x in parsed]
                return embedding
            elif isinstance(parsed, dict):
                # Try to find the embedding in the dict
                for key in ["embedding", "vector", "output", "result", "data"]:
                    if key in parsed and isinstance(parsed[key], list):
                        embedding = [float(x) for x in parsed[key]]
                        return embedding
                # If no key found, try the first list value
                for key, value in parsed.items():
                    if isinstance(value, list):
                        embedding = [float(x) for x in value]
                        return embedding
            
            return []
            
        except json.JSONDecodeError as e:
            return []
        except Exception as e:
            import traceback
            traceback.print_exc()
            return []

# Singleton instance
search_vector_service = SearchVectorService()   