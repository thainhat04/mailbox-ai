# AI Summarization Setup Guide

This guide explains how to set up and run the AI-powered email summarization feature using LangChain and Google Gemini.

## Overview

The AI summarization feature consists of two parts:
1. **AI Service** (Python/FastAPI): Standalone service that uses LangChain + Gemini to generate summaries
2. **Backend Integration** (NestJS): Updated to call the AI service instead of using mock summaries

## Quick Start

### Step 1: Install AI Service Dependencies

```bash
cd ai-service
uv sync
```

This will install:
- FastAPI
- LangChain
- LangChain Google GenAI
- Uvicorn
- Pydantic

### Step 2: Configure Gemini API Key

The AI service already has a Google API key configured in `.env`:

```bash
# ai-service/.env
GOOGLE_API_KEY=
```

**Note**: In production, you should use your own API key. Get one at: https://makersuite.google.com/app/apikey

### Step 3: Start the AI Service

```bash
cd ai-service
uv run python main.py
```

The service will start on `http://localhost:8000`

You can verify it's running by visiting:
- http://localhost:8000 (health check)
- http://localhost:8000/docs (API documentation)

### Step 4: Configure Backend

Add the AI service URL to your backend `.env` file:

```bash
# backend/.env
AI_SERVICE_URL=http://localhost:8000
```

### Step 5: Start the Backend

```bash
cd backend
npm run start:dev
```

The backend will now use the AI service for generating email summaries!

## Testing the Integration

### Option 1: Direct API Test

Test the AI service directly:

```bash
curl -X POST http://localhost:8000/api/v1/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Meeting Tomorrow",
    "body": "Hi team, we need to discuss the Q4 roadmap and review progress. Please join at 10 AM.",
    "max_length": 200
  }'
```

Expected response:
```json
{
  "summary": "✨ AI Summary: Meeting scheduled to discuss Q4 roadmap and review progress at 10 AM tomorrow.",
  "model_used": "gemini-1.5-flash"
}
```

### Option 2: Test Through Backend

Once both services are running, the backend's email summary endpoint will automatically use the AI service:

```bash
# Get summary for an email
GET http://localhost:8080/api/v1/emails/{emailId}/summary
```

## Architecture

```
┌─────────────┐         HTTP Request          ┌──────────────┐
│   Frontend  │ ───────────────────────────> │   Backend    │
│             │ <─────────────────────────── │   (NestJS)   │
└─────────────┘         Response              └──────┬───────┘
                                                     │
                                                     │ HTTP POST
                                                     │ /api/v1/summarize
                                                     │
                                                     ▼
                                              ┌──────────────┐
                                              │ AI Service   │
                                              │ (FastAPI)    │
                                              │              │
                                              │ ┌──────────┐ │
                                              │ │LangChain │ │
                                              │ └────┬─────┘ │
                                              │      │       │
                                              │      ▼       │
                                              │ ┌──────────┐ │
                                              │ │  Gemini  │ │
                                              │ │   API    │ │
                                              │ └──────────┘ │
                                              └──────────────┘
```

## File Structure

### AI Service Files Created

```
ai-service/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py                 # API router setup
│   │       └── endpoints/
│   │           └── summarization.py        # POST /api/v1/summarize endpoint
│   ├── core/
│   │   └── config.py                       # Configuration with Pydantic Settings
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── summarization.py                # Request/Response models
│   └── services/
│       └── summarization_service.py        # LangChain + Gemini integration
├── main.py                                 # FastAPI app entry point
├── pyproject.toml                          # Updated with LangChain dependencies
├── .env                                    # Contains GOOGLE_API_KEY
└── README.md                               # Detailed documentation
```

### Backend Files Modified

```
backend/src/modules/email/services/
└── summary.service.ts                      # Updated to call AI service
```

## Configuration Options

### AI Service (.env)

```bash
# Required
GOOGLE_API_KEY=your_api_key_here

# Optional (with defaults)
GEMINI_MODEL=gemini-1.5-flash              # Model to use
HOST=0.0.0.0                                # Server host
PORT=8000                                   # Server port
MAX_SUMMARY_LENGTH=200                      # Max summary chars
TEMPERATURE=0.3                             # AI creativity (0.0-1.0)
```

### Backend (.env)

```bash
# AI Service URL
AI_SERVICE_URL=http://localhost:8000
```

## How It Works

### 1. Backend Receives Summary Request

When a user requests an email summary, the backend's `SummaryService`:

1. Checks if a cached summary exists in the database
2. If not cached (or `forceRegenerate=true`), calls `generateAISummary()`
3. Makes HTTP POST request to AI service
4. Caches the result in the database
5. Returns summary to the user

### 2. AI Service Processes Request

The AI service:

1. Receives `subject` and `body` from backend
2. Cleans the text (removes HTML, signatures, etc.)
3. Creates a LangChain prompt with summarization guidelines
4. Calls Gemini API via LangChain
5. Parses and formats the response
6. Returns summary with emoji prefix

### 3. LangChain Pipeline

```python
# Create the chain
prompt = ChatPromptTemplate.from_messages([...])
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash")
chain = prompt | llm | StrOutputParser()

# Generate summary
summary = await chain.ainvoke({
    "subject": subject,
    "body": body,
    "max_length": 200
})
```

## Error Handling

The system includes robust error handling:

### If AI Service is Down

The backend automatically falls back to extractive summarization:

```typescript
try {
  // Try AI service
  const response = await axios.post(aiServiceUrl, ...);
  return response.data.summary;
} catch (error) {
  // Fallback to extractive summary
  return this.generateFallbackSummary(subject, body);
}
```

### If Gemini API Fails

The AI service catches errors and returns a fallback:

```python
try:
    summary = await self.chain.ainvoke(...)
    return f"✨ AI Summary: {summary}"
except Exception as e:
    return self._fallback_summary(subject, body)
```

## Performance

- **Average Response Time**: 1-3 seconds
- **Model**: Gemini 1.5 Flash (optimized for speed)
- **Caching**: Summaries are cached in database to avoid regeneration
- **Concurrent Requests**: FastAPI handles multiple requests efficiently

## Troubleshooting

### AI Service Won't Start

**Error**: `GOOGLE_API_KEY not found`

**Solution**: Ensure `.env` file exists in `ai-service/` directory with valid API key

---

**Error**: `Port 8000 already in use`

**Solution**:
- Stop other services on port 8000, or
- Change port in `ai-service/.env`: `PORT=8001`
- Update backend `.env`: `AI_SERVICE_URL=http://localhost:8001`

### Backend Can't Connect to AI Service

**Error**: Connection refused / ECONNREFUSED

**Solution**:
1. Verify AI service is running: `curl http://localhost:8000/health`
2. Check `AI_SERVICE_URL` in backend `.env`
3. Ensure no firewall blocking localhost:8000

### Slow Summary Generation

**Possible Causes**:
- Large email body (> 5000 characters)
- Gemini API rate limiting
- Network latency

**Solutions**:
- AI service already limits input to 2000 characters
- Check Gemini API quota: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com
- Use `gemini-1.5-flash-8b` for faster responses (update `GEMINI_MODEL` in `.env`)

## API Documentation

Visit http://localhost:8000/docs for interactive API documentation with:
- Try-it-out functionality
- Request/response schemas
- Example payloads
- Error responses

## Next Steps

1. ✅ AI service is set up with LangChain + Gemini
2. ✅ Backend integrated to call AI service
3. ✅ Fallback mechanism in place
4. 📝 Test with real email data
5. 📝 Monitor performance and adjust settings
6. 📝 Consider adding caching at AI service level for frequently requested summaries

## Support

For issues or questions about the AI summarization feature:
- Check the logs in both services
- Visit API docs: http://localhost:8000/docs
- Review the detailed README in `ai-service/README.md`
