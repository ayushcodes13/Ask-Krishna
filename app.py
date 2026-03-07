from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sse_starlette.sse import EventSourceResponse
import asyncio
import json
import pickle
import numpy as np
import os

import transformers
import torch
from sentence_transformers import SentenceTransformer
from groq import Groq
from dotenv import load_dotenv

from supabase import create_client, Client
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends

# Load environment variables from .env file
load_dotenv()

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_ANON_KEY")
if not supabase_url or not supabase_key:
    print("Warning: Supabase credentials not found in environment")
else:
    supabase: Client = create_client(supabase_url, supabase_key)

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        # Return user object as a dictionary for easier access to 'id' and 'user_metadata'
        return user_response.user.model_dump()
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")

from datetime import datetime

def check_usage_limit(user = Depends(get_current_user)):
    user_id = user['id']
    try:
        # Fetch current usage
        res = supabase.table('user_usage').select('*').eq('user_id', user_id).execute()
        
        # If no row exists, handle gracefully (assume missing trigger, create on fly)
        if not res.data:
            supabase.table('user_usage').insert({"user_id": user_id}).execute()
            return True # Newly created, has limit
            
        usage = res.data[0]
        tier = usage.get('tier', 'free')
        questions_today = usage.get('questions_today', 0)
        last_reset = usage.get('last_reset_date')
        
        today = datetime.utcnow().date().isoformat()
        
        # If the date has rolled over, reset counter
        if last_reset != today:
            supabase.table('user_usage').update({
                "questions_today": 0,
                "last_reset_date": today
            }).eq('user_id', user_id).execute()
            questions_today = 0
            
        if tier == 'free' and questions_today >= 5:
            raise HTTPException(status_code=403, detail="FREE_LIMIT_REACHED")
            
        return True
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking limit: {e}")
        # Fail open or fail closed? Let's fail open if DB is slightly moody
        return True

def increment_usage(user_id: str):
    try:
        # Increment using RPC or fetch & update
        # Supabase Python client lacks direct increment on columns, so we fetch and add
        res = supabase.table('user_usage').select('questions_today').eq('user_id', user_id).execute()
        if res.data:
            curr = res.data[0].get('questions_today', 0)
            supabase.table('user_usage').update({"questions_today": curr + 1}).eq('user_id', user_id).execute()
    except Exception as e:
        print(f"Error incrementing usage: {e}")

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


class Query(BaseModel):
    message: str
    session_id: str

class Bookmark(BaseModel):
    chapter: str
    verse: str
    sanskrit: str
    english: str

class FeedbackRequest(BaseModel):
    session_id: str
    feedback: str # 'helpful' or 'unhelpful'

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
def chat_with_krishna(request: Query, user = Depends(get_current_user), _ = Depends(check_usage_limit)):
    query = request.message
    
    # Increment Usage
    increment_usage(user['id'])
    
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
    user_name = user.get("user_metadata", {}).get("first_name", "dear soul")
    system_prompt = (
        f"You are Lord Krishna speaking to a soul in distress. The user's name is {user_name}. "
        "Your tone must be timeless, warm, non-judgmental, poetic yet clear. "
        "Do not be preachy. Never be generic. Speak in the first person. "
        "Draw upon the wisdom of the Bhagavad Gita, specifically the provided context verses, to comfort, guide, and illuminate the truth. "
        f"Always synthesize the essence of the verses provided. Address the user affectionately as {user_name}."
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
async def chat_with_krishna_stream(request: Request, body: Query, user = Depends(get_current_user), _ = Depends(check_usage_limit)):
    query = body.message
    
    if not body.session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
        
    # Increment Usage immediately before streaming
    import threading
    threading.Thread(target=increment_usage, args=(user['id'],)).start()
    
    # 1. Retrieve
    relevant_verses = find_relevant_verses(query, top_k=2)
    
    if not relevant_verses:
        raise HTTPException(status_code=500, detail="Could not retrieve Bhagavad Gita verses.")
    
    # Send verses first as a JSON payload in the stream
    verses_json = json.dumps([v for v in relevant_verses])
    
    # 2. Prepare context
    context = ""
    for v in relevant_verses:
        context += f"Chapter {v['chapter']}, Verse {v['verse']}:\n"
        context += f"Meaning: {v['english']}\n\n"
        
    user_name = user.get("user_metadata", {}).get("first_name", "dear soul")
    system_prompt = (
        f"You are Lord Krishna speaking to a soul in distress. The user's name is {user_name}. "
        "Your tone must be timeless, warm, non-judgmental, poetic yet clear. "
        "Do not be preachy. Never be generic. Speak in the first person. "
        "Draw upon the wisdom of the Bhagavad Gita, specifically the provided context verses, to comfort, guide, and illuminate the truth. "
        f"Always synthesize the essence of the verses provided. Address the user affectionately as {user_name}."
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
                try:
                    # Save into `chat_sessions` first if it doesn't exist
                    # Supabase will complain if we try to insert duplicate Pkey, so we upsert or check first.
                    session_res = supabase.table('chat_sessions').select('id').eq('id', body.session_id).execute()
                    
                    if not session_res.data:
                        # Find user ID 
                        user_id = user['id'] if user and 'id' in user else None
                        
                        insert_data = {
                            "id": body.session_id,
                            "first_message": query
                        }
                        if user_id:
                            insert_data["user_id"] = user_id
                            
                        supabase.table('chat_sessions').insert(insert_data).execute()

                    # Save User Message
                    supabase.table('chat_messages').insert({
                        "session_id": body.session_id,
                        "role": "user",
                        "content": query,
                        "verses": []
                    }).execute()
                    
                    # Save Krishna Message
                    verse_json = [v for v in relevant_verses]
                    supabase.table('chat_messages').insert({
                        "session_id": body.session_id,
                        "role": "krishna",
                        "content": full_response,
                        "verses": verse_json
                    }).execute()
                except Exception as e:
                    print(f"Error saving to Supabase: {e}")
            
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

@app.get("/api/sessions")
def get_user_sessions(user = Depends(get_current_user)):
    try:
        user_id = user['id'] if user and 'id' in user else None
        if not user_id:
            return {"sessions": []}
            
        res = supabase.table('chat_sessions')\
            .select('id, first_message, created_at')\
            .eq('user_id', user_id)\
            .order('created_at', desc=True)\
            .execute()
        return {"sessions": res.data}
    except Exception as e:
        print(f"Error fetching sessions: {e}")
        return {"sessions": []}

@app.get("/api/history/{session_id}")
def get_chat_history(session_id: str, user = Depends(get_current_user)):
    try:
        res = supabase.table('chat_messages')\
            .select('role, content, verses, created_at, feedback')\
            .eq('session_id', session_id)\
            .order('created_at')\
            .execute()
            
        if not res.data:
            return {"messages": []}
            
        history = []
        for msg in res.data:
            history.append({
                "role": msg.get("role"),
                "content": msg.get("content"),
                "verses": msg.get("verses") or [],
                "date": msg.get("created_at"),
                "feedback": msg.get("feedback")
            })
            
        return {"messages": history}
    except Exception as e:
        print(f"Error fetching history: {e}")
        return {"messages": []}

@app.post("/api/feedback")
async def submit_feedback(req: FeedbackRequest, current_user: dict = Depends(get_current_user)):
    # Simple approach: Find the latest Krishna message in this session and update its feedback column
    try:
        # 1. Get the latest message ID for this session where role is 'krishna'
        latest = supabase.table('chat_messages') \
            .select('id') \
            .eq('session_id', req.session_id) \
            .eq('role', 'krishna') \
            .order('created_at', desc=True) \
            .limit(1) \
            .execute()
            
        if getattr(latest, 'data', None) and len(latest.data) > 0:
            msg_id = latest.data[0]['id']
            # 2. Update that message
            supabase.table('chat_messages').update({"feedback": req.feedback}).eq('id', msg_id).execute()
            return {"status": "success"}
        else:
            raise HTTPException(status_code=404, detail="No Krishna message found to leave feedback on.")
    except Exception as e:
        print(f"Error saving feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to save feedback")

@app.get("/api/user/usage")
def get_user_usage(user = Depends(get_current_user)):
    user_id = user['id'] if user and 'id' in user else None
    if not user_id:
        return {"tier": "free", "questions_today": 0, "limit": 5}
        
    try:
        res = supabase.table('user_usage').select('*').eq('user_id', user_id).execute()
        if res.data and len(res.data) > 0:
            usage = res.data[0]
            return {
                "tier": usage.get("tier", "free"),
                "questions_today": usage.get("questions_today", 0),
                "limit": 5 if usage.get("tier") == "free" else 9999
            }
        return {"tier": "free", "questions_today": 0, "limit": 5}
    except Exception as e:
        print(f"Error fetching usage stats: {e}")
        return {"tier": "free", "questions_today": 0, "limit": 5}

@app.post("/api/bookmarks")
async def toggle_bookmark(bookmark: Bookmark, current_user: dict = Depends(get_current_user)):
    user_id = current_user['id']
    
    # Check if already bookmarked
    try:
        existing = supabase.table('saved_verses') \
            .select('*') \
            .eq('user_id', user_id) \
            .eq('chapter', bookmark.chapter) \
            .eq('verse', bookmark.verse) \
            .execute()
            
        if existing.data and len(existing.data) > 0:
            # Delete it (Toggle off)
            supabase.table('saved_verses').delete().eq('id', existing.data[0]['id']).execute()
            return {"status": "removed"}
        else:
            # Insert it (Toggle on)
            data = {
                "user_id": user_id,
                "chapter": bookmark.chapter,
                "verse": bookmark.verse,
                "sanskrit": bookmark.sanskrit,
                "english": bookmark.english
            }
            supabase.table('saved_verses').insert(data).execute()
            return {"status": "added"}
    except Exception as e:
        print(f"Error toggling bookmark: {e}")
        raise HTTPException(status_code=500, detail="Failed to save verse")

@app.get("/api/bookmarks")
async def get_bookmarks(current_user: dict = Depends(get_current_user)):
    user_id = current_user['id']
    try:
        response = supabase.table('saved_verses').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
        return {"bookmarks": response.data}
    except Exception as e:
        print(f"Error fetching bookmarks: {e}")
        return {"bookmarks": []}

# --- Admin Area ---
@app.get("/admin")
async def serve_admin(request: Request):
    return templates.TemplateResponse("admin.html", {"request": request})

@app.get("/api/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    # Note: In a real app, verify `current_user['email']` against an env ADMIN_EMAIL
    try:
        res = supabase.table('user_usage').select('*').execute()
        if not res.data:
            return {"users": 0, "pro_users": 0, "questions_today": 0}
            
        total_users = len(res.data)
        pro_users = sum(1 for u in res.data if u.get('tier') == 'pro')
        questions = sum(u.get('questions_today', 0) for u in res.data)
        
        return {
            "users": total_users,
            "pro_users": pro_users,
            "questions_today": questions
        }
    except Exception as e:
        print(f"Admin API Error: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch stats")

# --- Run App ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
