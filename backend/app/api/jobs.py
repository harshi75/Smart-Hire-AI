import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.db import get_db
from app.models.models import User, JobDescription
from app.models.schemas import JobDescriptionCreate, JobDescriptionOut
from app.utils.auth import get_current_user
from app.services.parser import extract_text
from app.services.ranking import extract_skills_from_jd

router = APIRouter()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


@router.post("/upload-jd", response_model=JobDescriptionOut)
async def upload_jd(
    title: str = Form(...),
    company: str = Form(""),
    file: Optional[UploadFile] = File(None),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jd_text = description or ""
    file_path = None

    if file:
        file_bytes = await file.read()
        ext = file.filename.split(".")[-1].lower()
        safe_name = f"jd_{uuid.uuid4().hex}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, safe_name)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        try:
            jd_text = extract_text(file_bytes, file.filename)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Could not parse JD file: {e}")

    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description text is required")

    required_skills, preferred_skills = extract_skills_from_jd(jd_text)

    jd = JobDescription(
        owner_id=current_user.id,
        title=title,
        company=company,
        description=jd_text,
        required_skills=required_skills,
        preferred_skills=preferred_skills,
        file_path=file_path,
    )
    db.add(jd)
    db.commit()
    db.refresh(jd)
    return jd


@router.post("/job-descriptions", response_model=JobDescriptionOut)
def create_jd(
    data: JobDescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    required_skills, preferred_skills = extract_skills_from_jd(data.description)
    jd = JobDescription(
        owner_id=current_user.id,
        title=data.title,
        company=data.company or "",
        description=data.description,
        required_skills=required_skills,
        preferred_skills=preferred_skills,
    )
    db.add(jd)
    db.commit()
    db.refresh(jd)
    return jd


@router.get("/job-descriptions", response_model=List[JobDescriptionOut])
def list_jds(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(JobDescription).filter(JobDescription.owner_id == current_user.id).order_by(JobDescription.created_at.desc()).all()


@router.get("/job-description/{jd_id}", response_model=JobDescriptionOut)
def get_jd(
    jd_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jd = db.query(JobDescription).filter(JobDescription.id == jd_id, JobDescription.owner_id == current_user.id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")
    return jd


@router.delete("/job-description/{jd_id}")
def delete_jd(
    jd_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jd = db.query(JobDescription).filter(JobDescription.id == jd_id, JobDescription.owner_id == current_user.id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(jd)
    db.commit()
    return {"message": "Deleted"}
