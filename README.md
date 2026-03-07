# GeetaBot ✦ Seek Divine Guidance

An AI-powered SaaS application that provides spiritual guidance and wisdom drawn from the verses of the Bhagavad Gita. Designed with a "Sacred Minimalism" aesthetic, GeetaBot acts as a conversational interface where users can seek clarity, comfort, and direction from a persona modeled after Shri Krishna.

![GeetaBot Interface Preview](https://via.placeholder.com/800x400?text=GeetaBot+SaaS+Interface)

## ✨ Core SaaS Features

GeetaBot has been expanded from a simple script into a fully-fledged SaaS product template, demonstrating full-stack engineering, authentication, and database integration:

*   **Authentication & User Identity (Supabase)**: Secure Email/Password and Google OAuth login flows. Personalized greetings based on user profiles.
*   **Conversation History ("Your Journey")**: Persistent chat sessions stored in PostgreSQL. Users can view and load past dialogues via a beautiful, journal-style sidebar.
*   **Freemium Monetization Model**: Implemented rate-limiting and usage tracking. Free users get 5 divine answers per day, encouraging upgrades to a "Pro" tier.
*   **Virality & Social Proof**: Generates gorgeous, downloadable text-cards of verses using `html2canvas`, optimized for Instagram, Twitter, or WhatsApp sharing.
*   **Saved Verses (Bookmarks)**: Users can star and bookmark verses that resonate with them, storing them in a dedicated Supabase table for later reflection.
*   **Onboarding Flow**: A welcoming modal for new souls with "Suggestion Chips" to jumpstart their first conversation seamlessly.
*   **Feedback Loop**: Users can thumbs-up or thumbs-down responses to help curate the best prompt responses.
*   **Admin Dashboard**: A secure `admin.html` dashboard to monitor total users, active subscriptions, and daily platform usage metrics.
*   **Simulated Email Worker**: A background python script (`worker.py`) that demonstrates how to dispatch "Daily Verses" and re-engagement emails.

## 🛠 Tech Stack

*   **Backend Framework**: Python / FastAPI
*   **Database & Auth**: Supabase (PostgreSQL, GoTrue)
*   **AI Engine**: Groq Cloud API (Llama 3) for blazing-fast inference
*   **Embeddings**: Sentence-Transformers (`all-MiniLM-L6-v2`) for Semantic Retrieval (RAG)
*   **Frontend**: HTML5, Vanilla JavaScript, CSS3 (No heavy frontend frameworks)

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
You will need Python 3.9+, Node.js (optional, for frontend tooling if added later), and a Supabase project.

### 2. Environment Variables
Create a `.env` file in the root directory and populate it with your keys:
```env
GROQ_API_KEY=your_groq_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Database Setup (Supabase)
Run the provided SQL script `supabase_setup_usage.sql` in your Supabase SQL Editor. This will set up the necessary tables (`chat_sessions`, `chat_messages`, `user_usage`, `saved_verses`) and Row Level Security (RLS) policies.

### 4. Installation
Create a virtual environment and install the dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Running the Application
Start the FastAPI server using Uvicorn:
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```
The application will be available at `http://localhost:8000`.

## 📜 Repository Structure
```
├── app.py                 # Core FastAPI Backend & RAG Pipeline
├── requirements.txt       # Python Dependencies
├── worker.py              # Simulated Notification Worker
├── supabase_setup_*.sql   # Database schemas and RLS definitions
├── templates/
│   ├── index.html         # Main Chat Interface & App Shell
│   └── admin.html         # Admin Analytics Dashboard
└── static/
    ├── style.css          # Design System implementation
    └── script.js          # Client-side routing, auth, and UI logic
```

## 🎨 Design Philosophy
The UI strictly adheres to a "Sacred Minimalism" aesthetic.
*   **Colors**: Midnight (`#1A1200`), Marigold (`#E8A020`), Peacock Teal (`#1A6B72`), Warm Parchment (`#FDF3DC`).
*   **Typography**: *Yeseva One* and *Philosopher* for headings; *Crimson Pro* and *Lora* for readable, ancient-feeling body text.

---
*Built with reverence as a portfolio project.*
