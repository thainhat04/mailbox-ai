from sentence_transformers import SentenceTransformer
import re


class SearchVectorService:
    """Service for generating vector embeddings using local sentence-transformers model"""

    def __init__(self):
        # Initialize local sentence-transformers model
        # all-MiniLM-L6-v2 produces 384-dimensional embeddings
        # It's a lightweight model optimized for semantic search
        self.model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        self.embedding_dimension = 384


    def clean_text(self, text: str) -> str:
        """Clean the text to remove HTML tags and excessive whitespace"""
        if text is None:
            return ""
        text = re.sub(r'<[^>]*>', '', text)
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'(Sent from|Get Outlook|--\s)', '', text, flags=re.IGNORECASE)
        return text.strip()

    async def create_vector_embedding(self, text: str, max_length: int = 512) -> list[float]:
        """Create a vector embedding for the given text using local sentence-transformers model"""
        if not text or not text.strip():
            return []

        clean_text = self.clean_text(text)

        # Truncate to max_length (all-MiniLM-L6-v2 supports up to 256 word pieces, ~512 characters is safe)
        if len(clean_text) > max_length:
            clean_text = clean_text[:max_length]

        try:
            # Generate embedding using local model
            # The model returns a numpy array, convert to list
            embedding = self.model.encode(clean_text, convert_to_numpy=True)

            # Convert numpy array to Python list (384 dimensions)
            return embedding.tolist()
        except Exception as e:
            import traceback
            print(f"Error generating embedding: {e}")
            traceback.print_exc()
            return []

    async def create_vector_embeddings_batch(self, texts: list[str], max_length: int = 512) -> list[list[float]]:
        """Create vector embeddings for multiple texts in batch using local sentence-transformers model"""
        if not texts or len(texts) == 0:
            return []

        # Clean all texts
        cleaned_texts = [
            self.clean_text(text)[:max_length] if text else ""
            for text in texts
        ]

        try:
            # Generate embeddings in batch for efficiency
            # sentence-transformers supports efficient batch processing
            # Filter out empty texts but keep track of their indices
            non_empty_texts = [text for text in cleaned_texts if text]
            non_empty_indices = [i for i, text in enumerate(cleaned_texts) if text]

            if not non_empty_texts:
                return [[] for _ in texts]

            # Generate embeddings for non-empty texts
            embeddings_array = self.model.encode(
                non_empty_texts,
                convert_to_numpy=True,
                show_progress_bar=False
            )

            # Reconstruct the full list with empty lists for empty texts
            embeddings = [[] for _ in texts]
            for idx, embedding in zip(non_empty_indices, embeddings_array):
                embeddings[idx] = embedding.tolist()

            return embeddings
        except Exception as e:
            import traceback
            print(f"Error generating batch embeddings: {e}")
            traceback.print_exc()
            return []

# Singleton instance
search_vector_service = SearchVectorService()   