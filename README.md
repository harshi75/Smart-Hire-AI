# SmartHire AI 🚀
### Intelligent Recruitment Automation Platform

AI-powered recruitment platform — resume parsing, semantic ranking, skill-gap analysis, learning roadmaps, interview question generation, and a recruiter copilot chatbot.

---

## 🗂️ Project Structure

```
smarthire-ai/
├── backend/          ← FastAPI + PostgreSQL
│   ├── app/
│   │   ├── api/      ← auth, candidates, jobs, analysis, analytics, export, chat
│   │   ├── models/   ← SQLAlchemy models + Pydantic schemas
│   │   ├── services/ ← parser, ranking (sentence-transformers), AI (Gemini)
│   │   ├── utils/    ← JWT auth
│   │   └── database/ ← DB connection
│   ├── .env          ← your config (edit this)
│   ├── requirements.txt
│   └── start.sh
├── frontend/         ← React + Vite + TailwindCSS
│   ├── src/
│   │   ├── pages/    ← Dashboard, Candidates, Upload, Jobs, Analytics, Compare, Detail
│   │   ├── components/
│   │   ├── services/ ← API layer
│   │   └── hooks/
│   ├── .env          ← VITE_API_URL
│   └── package.json
└── README.md
```

---

## ⚡ Setup & Run (Local)

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL running locally

---

### 1. PostgreSQL — create database

```bash
psql -U postgres
CREATE DATABASE smarthire;
\q
```

---

### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Mac/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Edit .env — set your DB password and optionally GEMINI_API_KEY
nano .env        # or open in any editor

# Start the server
uvicorn app.main:app --reload --port 8000
```

Backend runs at → **http://localhost:8000**
API docs at → **http://localhost:8000/docs**

---

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at → **http://localhost:5173**

---

## 🔑 Environment Variables

### `backend/.env`
| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/smarthire` | PostgreSQL connection string |
| `SECRET_KEY` | — | JWT signing key (change in production) |
| `GEMINI_API_KEY` | — | Free at https://aistudio.google.com — enables AI summaries, roadmaps, interview Qs |
| `UPLOAD_DIR` | `./uploads` | Where resumes are stored |
| `CORS_ORIGINS` | `http://localhost:5173` | Frontend URL |

### `frontend/.env`
| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend URL |

---

## ✨ Features

| Feature | Details |
|---|---|
| **Resume Upload** | PDF, DOCX, TXT · Drag-and-drop · Batch upload |
| **AI Resume Parsing** | Name, email, phone, skills, education, experience, projects |
| **Semantic Ranking** | `all-MiniLM-L6-v2` embeddings + cosine similarity |
| **AI Match Score** | 0–100% composite (semantic + skill + experience + education) |
| **Skill Gap Analysis** | Missing skills + curated learning resources |
| **Learning Roadmap** | 30/60/90-day personalized plans via Gemini |
| **AI Candidate Summary** | Recruiter-friendly AI-generated summary |
| **Interview Questions** | Technical · Behavioral · Project — Easy/Medium/Hard |
| **Recruiter Copilot** | Chat with any resume (Gemini RAG) |
| **Analytics Dashboard** | KPIs, charts, pipeline status, top skills |
| **Candidate Comparison** | Side-by-side up to 5 candidates with skills matrix |
| **Export** | CSV + Excel with match scores |
| **JWT Auth** | Register · Login · Protected routes |

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/register` | Create account |
| `POST` | `/api/login` | JWT login |
| `POST` | `/api/upload-resume` | Parse & store resume |
| `GET` | `/api/candidates` | List candidates |
| `GET` | `/api/candidate/{id}` | Candidate detail |
| `POST` | `/api/job-descriptions` | Create job description |
| `POST` | `/api/rank` | Run AI ranking |
| `POST` | `/api/skill-gap` | Skill gap analysis |
| `POST` | `/api/roadmap` | Generate learning roadmap |
| `POST` | `/api/interview-questions` | Generate interview questions |
| `POST` | `/api/compare` | Compare multiple candidates |
| `POST` | `/api/chat` | Recruiter copilot chat |
| `GET` | `/api/analytics` | Analytics data |
| `GET` | `/api/export` | Export CSV/Excel |

Full Swagger UI → **http://localhost:8000/docs**

---

## 🗄️ Database Tables

`users` · `candidates` · `job_descriptions` · `candidate_scores` · `skill_gaps` · `chat_history`

Tables are created automatically on first run via SQLAlchemy.

---

## 🔮 Future Scope

- LinkedIn profile import
- Email outreach automation
- Video interview scheduling
- Multi-language resume support
- ATS integrations (Greenhouse, Lever)
