from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
import asyncio
import json
import pickle
import numpy as np
import os
import datetime
from sqlalchemy.orm import Session
from fastapi import Depends
from database import engine, get_db
import models

# Create database tables
models.Base.metadata.create_all(bind=engine)

import transformers
import torch
from sentence_transformers import SentenceTransformer
from groq import Groq
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize Groq client
groq_api_key = os.environ.get("GROQ_API_KEY")
if not groq_api_key:
    raise ValueError("GROQ_API_KEY environment variable not set. Please create a .env file with your API key.")
    
groq_client = Groq(api_key=groq_api_key)

app = FastAPI(title="Ask-Krishna API")

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# 1. Load Data & Embeddings
print("Loading Gita Embeddings...")
EMBEDDING_FILE = "gita_embeddings.pkl"
try:
    with open(EMBEDDING_FILE, "rb") as f:
        df = pickle.load(f)
    print(f"Loaded {len(df)} verses.")
    
    # Reconstruct the embeddings matrix
    # The embeddings are stored in a column 'embedding' as numpy arrays
    import numpy as np
    embeddings_matrix = np.vstack(df['embedding'].values)
    
except Exception as e:
    print(f"Error loading embeddings: {e}")
    df = None
    embeddings_matrix = None

# 2. Load Models
print("Loading Sentence Transformer...")
retriever_model = SentenceTransformer('all-MiniLM-L6-v2')

# Note: We should use a much smaller model locally or rely on an API if we don't have GPU
# Using a quantized local model or an API like Groq is better for a SaaS. 
# For now, we'll setup a lightweight local generator placeholder.
print("Setting up Generator Pipeline...")
# generator = pipeline("text-generation", model="TinyLlama/TinyLlama-1.1B-Chat-v1.0", device_map="auto")


class ChatRequest(BaseModel):
    message: str
    session_id: str

class VerseDetail(BaseModel):
    chapter: int
    verse: int
    sanskrit: str
    english: str

class ChatResponse(BaseModel):
    response: str
    verses: list[VerseDetail]

@app.get("/")
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

def find_relevant_verses(query: str, top_k: int = 3):
    if df is None or embeddings_matrix is None:
        return []
    
    query_embedding = retriever_model.encode(query, convert_to_numpy=True)
    
    # Calculate cosine similarity
    # normalized dot product
    query_norm = np.linalg.norm(query_embedding)
    matrix_norm = np.linalg.norm(embeddings_matrix, axis=1)
    
    similarities = np.dot(embeddings_matrix, query_embedding) / (matrix_norm * query_norm)
    
    # Get top k indices
    top_indices = np.argsort(similarities)[::-1][:top_k]
    
    relevant_verses = []
    for idx in top_indices:
        verse_data = df.iloc[idx]
        relevant_verses.append({
            "chapter": int(verse_data.get('chapter', 0)),
            "verse": int(verse_data.get('verse', 0)),
            "sanskrit": str(verse_data.get('shloka', '')),
            "english": str(verse_data.get('engmeaning', ''))
        })
    return relevant_verses

@app.post("/api/chat", response_model=ChatResponse)
def chat_with_krishna(request: ChatRequest):
    query = request.message
    
    # 1. Retrieve
    relevant_verses = find_relevant_verses(query, top_k=2)
    
    if not relevant_verses:
        raise HTTPException(status_code=500, detail="Could not retrieve Bhagavad Gita verses.")
    
    # 2. Prepare context
    context = ""
    for v in relevant_verses:
        context += f"Chapter {v['chapter']}, Verse {v['verse']}:\n"
        context += f"Meaning: {v['english']}\n\n"
        
    # 3. Generate Response using Groq API
    system_prompt = (
        "You are Lord Krishna speaking to a soul in distress. "
        "Your tone must be timeless, warm, non-judgmental, poetic yet clear. "
        "Do not be preachy. Never be generic. Speak in the first person. "
        "Draw upon the wisdom of the Bhagavad Gita, specifically the provided context verses, to comfort, guide, and illuminate the truth. "
        "Always synthesize the essence of the verses provided. You may refer to the user as 'dear soul' or similar affectionate terms."
    )
    
    user_prompt = f"The user says: {query}\n\nHere are some relevant verses from the Bhagavad Gita for context:\n\n{context}\n\nPlease provide your response based on this context."
    
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                }
            ],
            model="llama-3.1-8b-instant",
        )
        generated_response = chat_completion.choices[0].message.content
    except Exception as e:
        print(f"Error generating response from Groq: {e}")
        generated_response = "My apologies, dear soul. The divine connection seems clouded at this moment. Please try speaking to me again."
    
    return ChatResponse(
        response=generated_response,
        verses=relevant_verses
    )

@app.post("/api/chat/stream")
async def chat_with_krishna_stream(request: Request, body: ChatRequest):
    query = body.message
    
    if not body.session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    # 1. Retrieve
    relevant_verses = find_relevant_verses(query, top_k=2)
    
    if not relevant_verses:
        raise HTTPException(status_code=500, detail="Could not retrieve Bhagavad Gita verses.")
    
    # Send verses first as a JSON payload in the stream
    verses_json = json.dumps([v.model_dump() if hasattr(v, 'model_dump') else v for v in relevant_verses])
    
    # 2. Prepare context
    context = ""
    for v in relevant_verses:
        context += f"Chapter {v['chapter']}, Verse {v['verse']}:\n"
        context += f"Meaning: {v['english']}\n\n"
        
    system_prompt = (
        "You are Lord Krishna speaking to a soul in distress. "
        "Your tone must be timeless, warm, non-judgmental, poetic yet clear. "
        "Do not be preachy. Never be generic. Speak in the first person. "
        "Draw upon the wisdom of the Bhagavad Gita, specifically the provided context verses, to comfort, guide, and illuminate the truth. "
        "Always synthesize the essence of the verses provided. You may refer to the user as 'dear soul' or similar affectionate terms."
    )
    
    user_prompt = f"The user says: {query}\n\nHere are some relevant verses from the Bhagavad Gita for context:\n\n{context}\n\nPlease provide your response based on this context."
    
    async def event_generator():
        # First yield the verses metadata
        yield {
            "event": "verses",
            "data": verses_json
        }
        
        try:
            # Generate streaming response
            stream = groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model="llama-3.1-8b-instant",
                stream=True,
            )
            
            full_response = ""
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    # Yield each token to the client
                    full_response += chunk.choices[0].delta.content
                    yield {
                        "event": "message",
                        "data": chunk.choices[0].delta.content
                    }
                    await asyncio.sleep(0.01)
                    
            # --- Save to Database after successful stream ---
            def save_to_db():
                db = next(get_db())
                # Ensure session exists
                db_session = db.query(models.ChatSession).filter(models.ChatSession.id == body.session_id).first()
                if not db_session:
                    db_session = models.ChatSession(id=body.session_id)
                    db.add(db_session)
                    db.commit()
                
                # Save User Message
                user_msg = models.ChatMessage(session_id=body.session_id, role="user", content=query)
                db.add(user_msg)
                
                # Save Krishna Message
                krishna_msg = models.ChatMessage(
                    session_id=body.session_id,
                    role="krishna",
                    content=full_response,
                    verses=[v.model_dump() if hasattr(v, 'model_dump') else v for v in relevant_verses]
                )
                db.add(krishna_msg)
                
                db.commit()
            
            # Run save blocking task in background
            import threading
            threading.Thread(target=save_to_db).start()
                    
        except Exception as e:
            print(f"Error streaming from Groq: {e}")
            yield {
                "event": "message",
                "data": "\n\n[Connection clouded. Please try again later.]"
            }
            
        yield {
            "event": "done",
            "data": "[DONE]"
        }

    return EventSourceResponse(event_generator())

@app.get("/api/history/{session_id}")
def get_chat_history(session_id: str, db: Session = Depends(get_db)):
    db_session = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
    if not db_session:
        return {"messages": []}
    
    # Sort messages by creation time
    messages = db.query(models.ChatMessage).filter(models.ChatMessage.session_id == session_id).order_by(models.ChatMessage.created_at.asc()).all()
    
    history = []
    for msg in messages:
        history.append({
            "role": msg.role,
            "content": msg.content,
            "verses": msg.verses or [],
            "date": msg.created_at.isoformat()
        })
        
    return {"messages": history}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
