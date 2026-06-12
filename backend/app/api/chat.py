from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database.db import get_db
from app.models.models import User, Candidate, ChatHistory
from app.models.schemas import ChatRequest, ChatMessageOut
from app.utils.auth import get_current_user
from app.services.ai_service import chat_with_resume

router = APIRouter()


@router.post("/chat")
def chat(
    data: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Candidate).filter(Candidate.id == data.candidate_id, Candidate.owner_id == current_user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")

    history = db.query(ChatHistory).filter(
        ChatHistory.candidate_id == c.id,
        ChatHistory.user_id == current_user.id,
    ).order_by(ChatHistory.created_at.asc()).limit(20).all()

    history_data = [{"role": h.role, "message": h.message} for h in history]

    candidate_data = {
        "name": c.name,
        "skills": c.skills or [],
        "experience": c.experience or [],
        "education": c.education or [],
        "projects": c.projects or [],
        "certifications": c.certifications or [],
        "raw_text": c.raw_text or "",
    }

    response = chat_with_resume(
        message=data.message,
        candidate_data=candidate_data,
        chat_history=history_data,
    )

    # Save user message
    db.add(ChatHistory(candidate_id=c.id, user_id=current_user.id, role="user", message=data.message))
    # Save assistant response
    db.add(ChatHistory(candidate_id=c.id, user_id=current_user.id, role="assistant", message=response))
    db.commit()

    return {"response": response, "candidate": {"id": c.id, "name": c.name}}


@router.get("/chat/{candidate_id}/history", response_model=List[ChatMessageOut])
def get_chat_history(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.owner_id == current_user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return db.query(ChatHistory).filter(
        ChatHistory.candidate_id == candidate_id,
        ChatHistory.user_id == current_user.id,
    ).order_by(ChatHistory.created_at.asc()).all()


@router.delete("/chat/{candidate_id}/history")
def clear_chat_history(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(ChatHistory).filter(
        ChatHistory.candidate_id == candidate_id,
        ChatHistory.user_id == current_user.id,
    ).delete()
    db.commit()
    return {"message": "Chat history cleared"}
