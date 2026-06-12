import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.db import get_db
from app.models.models import User, Candidate
from app.models.schemas import CandidateOut, CandidateStatusUpdate
from app.utils.auth import get_current_user
from app.services.parser import extract_text, parse_resume

router = APIRouter()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


@router.post("/upload-resume", response_model=CandidateOut)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed = {"pdf", "docx", "doc", "txt"}
    ext = file.filename.split(".")[-1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"File type .{ext} not supported")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    safe_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    try:
        raw_text = extract_text(file_bytes, file.filename)
        parsed = parse_resume(raw_text)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse resume: {str(e)}")

    candidate = Candidate(
        owner_id=current_user.id,
        name=parsed.get("name"),
        email=parsed.get("email"),
        phone=parsed.get("phone"),
        skills=parsed.get("skills", []),
        education=parsed.get("education", []),
        experience=parsed.get("experience", []),
        certifications=parsed.get("certifications", []),
        projects=parsed.get("projects", []),
        raw_text=raw_text[:10000],
        file_path=file_path,
        file_name=file.filename,
        parse_confidence=parsed.get("parse_confidence", 0.0),
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


@router.get("/candidates", response_model=List[CandidateOut])
def list_candidates(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Candidate).filter(Candidate.owner_id == current_user.id)
    if status:
        q = q.filter(Candidate.status == status)
    return q.order_by(Candidate.created_at.desc()).all()


@router.get("/candidate/{candidate_id}", response_model=CandidateOut)
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.owner_id == current_user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return c


@router.patch("/candidate/{candidate_id}/status")
def update_status(
    candidate_id: int,
    data: CandidateStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.owner_id == current_user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    allowed = {"new", "shortlisted", "rejected", "interview"}
    if data.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {allowed}")
    c.status = data.status
    db.commit()
    return {"id": candidate_id, "status": data.status}


@router.delete("/candidate/{candidate_id}")
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.owner_id == current_user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if c.file_path and os.path.exists(c.file_path):
        os.remove(c.file_path)
    db.delete(c)
    db.commit()
    return {"message": "Candidate deleted"}
