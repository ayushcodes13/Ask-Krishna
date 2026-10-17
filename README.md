<div align="center">

# 🦚 Ask Krishna

**Seek Divine Guidance Through the Wisdom of the Bhagavad Gita**

<a href="https://python.org">
  <img src="https://img.shields.io/badge/Python-3.9+-blue.svg?style=for-the-badge&logo=python&logoColor=white&color=1A6B72" alt="Python 3.9+" />
</a>
<a href="https://fastapi.tiangolo.com/">
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
</a>
<a href="https://supabase.com/">
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
</a>
<a href="https://groq.com/">
  <img src="https://img.shields.io/badge/AI_Engine-Groq_Llama_3.1-F87171?style=for-the-badge&logo=meta&logoColor=white&color=FDF3DC&labelColor=1A1200" alt="Groq with Llama 3.1" />
</a>

<br>
<img src="screenshots/landing-desktop.png" alt="Ask Krishna landing screen at desktop width" width="800" />
<br><br>

</div>

---

## ✨ Features \& Capabilities

**Ask Krishna** is a full-stack prototype for asking questions about the Bhagavad Gita. Its intended flow retrieves relevant verses from a local embeddings file and asks Groq's `llama-3.1-8b-instant` model to generate a response, with a FastAPI backend and a browser UI styled around **Sacred Minimalism**. The backend requires configured Groq and Supabase services. An end-to-end response and persistence flow has not been verified in this checkout.

*   🔐 **Authentication UI**: Email/password and Google OAuth flows are wired through Supabase Auth; configure and enable the Google provider in Supabase before using OAuth.
*   📖 **"Your Journey" History**: The app is designed to persist chat sessions in Supabase/PostgreSQL and show them in the sidebar. Database access from the backend has not been exercised; see the verification limits below.
*   💎 **Usage Limit Prototype**: The code tracks a five-question daily limit for free accounts and shows a Pro upgrade modal. There is no payment or subscription checkout integration.
*   🖼️ **Viral Share Cards**: Generates gorgeous, downloadable image cards of verses using `html2canvas`, optimized for Instagram, Twitter, and WhatsApp.
*   ⭐ **Saved Wisdom UI**: The interface is wired to a Supabase `saved_verses` table, but this repository has no migration for that table and the live persistence path has not been verified.
*   👋 **Personalized Onboarding**: A welcoming modal for new souls with "Suggestion Chips" to instantly jumpstart their journey.
*   👍 **Response Feedback**: The UI can submit thumbs-up/down feedback for the latest answer in a session; the saved feedback is not used to change the model instructions.
*   📊 **Admin Dashboard**: An admin-email-gated control panel (`/admin`) with code for total users, Pro-tier users, and today's usage counts. It requires `ADMIN_EMAIL` and a working Supabase backend; these stats are not live-verified.
*   📨 **Notification Worker Demo**: `worker.py` prints simulated daily-verse email dispatches. It does not send email; it uses the anon key and cannot enumerate/authenticate recipient emails as written.

---

## 📸 Screenshots

These are captures of the repository's actual frontend. The desktop sign-in panel was opened by clicking **Begin Your Journey**; no account details were entered. The narrow capture is approximately 480 CSS pixels wide, produced with 300% browser zoom in Chrome because the available Aside browser did not expose viewport resizing.

<div align="center">
  <img src="screenshots/auth-desktop.png" alt="Ask Krishna login and sign-up panel at desktop width" width="800" />
  <br />
  <sub>Desktop sign-in panel (1440 × 900)</sub>
  <br /><br />
  <img src="screenshots/landing-mobile.jpg" alt="Ask Krishna landing screen at a narrow effective content width" width="320" />
  <br />
  <sub>Narrow landing view (~480 CSS px effective width)</sub>
</div>

The captures verify the frontend presentation only. Python syntax checks pass, but the FastAPI server could not be started here because the project dependencies are not installed and `GROQ_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` are absent. Authentication, database reads/writes, and generated answers were not exercised. The backend validates the user's token, but its table operations use a global Supabase client initialized with the anon key rather than forwarding that user's token. Since the SQL policies use `auth.uid()`, protected reads and writes are likely to be rejected until the database request identity is wired correctly. Resolve and verify that boundary before relying on persistence; do not put a service-role key in browser code.

---

## 🛠 Tech Stack \& Architecture

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | `FastAPI` | High-performance Python async framework handling APIs and SSE streaming. |
| **Database & Auth** | `Supabase` | Managed PostgreSQL with Row-Level Security (RLS) and JWT auth. |
| **AI Engine** | `Groq Cloud` | Utilizing Llama 3 for blazing-fast inference and conversational persona. |
| **RAG/Embeddings** | `SentenceTransformers` | Local `all-MiniLM-L6-v2` model for semantic retrieval of Gita verses. |
| **Frontend** | `HTML/CSS/JS` | Pure vanilla implementation. Zero bloat, ensuring maximum performance. |

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
You will need **Python 3.9+**, a **Supabase** project, and a **Groq API key**. The application loads its embedding data and sentence-transformer model during startup; allow the first run to download/cache the model and budget for its memory and startup cost.

### 2. Environment Variables
Create a `.env` file in the root directory and securely populate your keys:
```env
GROQ_API_KEY=your_groq_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Database setup
Run `supabase_setup.sql` and then `supabase_setup_usage.sql` in the Supabase SQL Editor. They define the chat, message, and usage tables and associated policies/trigger. The application also reads/writes a `saved_verses` table, but no migration for that table is included in this repository; create and review that schema and its Row Level Security policies before enabling bookmarks. Configure the Google OAuth provider and its redirect URLs in Supabase if you want Google sign-in.

### 4. Installation
Create a virtual environment and install the dependencies to keep your system clean:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Running the Application
Start the FastAPI server:
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```
The divine experience will be available at `http://localhost:8000`.

### 6. Optional configuration

`ALLOWED_ORIGINS` is a comma-separated list used by the FastAPI CORS middleware (defaults to the two localhost origins). Set `ADMIN_EMAIL` to the email allowed to read `/api/admin/stats`. The browser client currently contains the Supabase project URL and publishable/anon key in `static/script.js` and `templates/admin.html`; these are public client credentials, not service-role secrets. Never put a service-role key in browser code.

### 7. Smoke checks

From the repository root, run `python3 -m py_compile app.py worker.py` for syntax checks. After dependencies, environment variables, database schema, and providers are configured, start the app and manually verify sign-up/sign-in, a streamed question with retrieved verses, history reload, bookmarks, feedback, usage limit behavior, and admin authorization. No automated test suite is currently included, and those live-service checks have not been completed for this repository state.

---

## Deployment

`render.yaml` describes a Render web service. The FastAPI app loads PyTorch/SentenceTransformers and a local embeddings file during startup, so package size, cold start, memory use, and file access need validation before recommending a serverless deployment. No live API deployment was verified in this checkout. A separate static portfolio presentation is live at [ask-krishna.devayushrout.me](https://ask-krishna.devayushrout.me); it does not run the FastAPI application. The former `geetabot.com` hostname was not resolving when checked on 2026-10-16, so it is not presented as a live app link.

## 🎨 Design Philosophy: *Sacred Minimalism*

The UI ditches the generic "SaaS look" for an ancient, premium, temple-like atmosphere.
*   **Midnight** (`#1A1200`) and **Warm Parchment** (`#FDF3DC`) contrasts.
*   **Marigold Gold** (`#E8A020`) and **Peacock Teal** (`#1A6B72`) accents.
*   Typography relies on **Yeseva One** and **Crimson Pro** for a readable, classic-feeling body text.

<div align="center">
  <br>
  <i>Built with reverence as a portfolio project.</i>
</div>

## Project presentation

A static, screenshot-led portfolio page for this project is live at [ask-krishna.devayushrout.me](https://ask-krishna.devayushrout.me). It shows the captured frontend only; it does not provide a live chat, authentication, verse retrieval, or database access. See the setup notes above for the separate FastAPI application's requirements and current verification limits.
