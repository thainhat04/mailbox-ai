#!/usr/bin/env python3
"""Test script to verify Gemini API connection"""

import asyncio
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Load environment variables
load_dotenv()

async def test_gemini():
    """Test Gemini API connection"""

    api_key = os.getenv("GOOGLE_API_KEY")
    print(f"API Key loaded: {api_key[:20]}..." if api_key else "API Key not found!")

    if not api_key:
        print("ERROR: GOOGLE_API_KEY not found in .env file")
        return

    try:
        # Initialize Gemini
        model_name = os.getenv("GEMINI_MODEL", "gemini-pro")
        print(f"\n1. Initializing Gemini model ({model_name})...")
        llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=0.3,
        )
        print("✓ Model initialized successfully")

        # Create a simple prompt
        print("\n2. Creating prompt...")
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful assistant. Summarize the following in one sentence."),
            ("user", "Email: Meeting tomorrow at 10 AM to discuss project progress.")
        ])
        print("✓ Prompt created")

        # Create chain
        print("\n3. Creating LangChain chain...")
        chain = prompt | llm | StrOutputParser()
        print("✓ Chain created")

        # Test generation
        print("\n4. Testing AI generation...")
        result = await chain.ainvoke({})
        print(f"✓ AI Response: {result}")

        print("\n✅ All tests passed! Gemini API is working correctly.")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_gemini())
