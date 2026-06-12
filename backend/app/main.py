from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

load_dotenv()

from app.database.db import engine, Base
from app.api import auth, candidates, jobs, analysis, analytics, export, chat

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SmartHire AI",
    description="Intelligent Recruitment Automation Platform",
    version="1.0.0",
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(candidates.router, prefix="/api", tags=["Candidates"])
app.include_router(jobs.router, prefix="/api", tags=["Jobs"])
app.include_router(analysis.router, prefix="/api", tags=["Analysis"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(export.router, prefix="/api", tags=["Export"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "SmartHire AI"}
