from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database.db import get_db
from app.models.models import User, Candidate, JobDescription, CandidateScore, SkillGap
from app.models.schemas import RankRequest, SkillGapRequest, RoadmapRequest, InterviewQRequest, CompareRequest
from app.utils.auth import get_current_user
from app.services.ranking import rank_candidate, compute_skill_gap, extract_skills_from_jd
from app.services.ai_service import (
    generate_candidate_summary,
    generate_roadmap,
    generate_interview_questions,
)

router = APIRouter()


def _get_candidate(db, candidate_id, user_id):
    c = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.owner_id == user_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return c


def _get_jd(db, jd_id, user_id):
    jd = db.query(JobDescription).filter(JobDescription.id == jd_id, JobDescription.owner_id == user_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")
    return jd


@router.post("/rank")
def rank(data: RankRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = _get_candidate(db, data.candidate_id, current_user.id)
    jd = _get_jd(db, data.job_description_id, current_user.id)

    result = rank_candidate(
        candidate_text=c.raw_text or "",
        candidate_skills=c.skills or [],
        jd_text=jd.description,
        jd_required_skills=jd.required_skills or [],
        jd_preferred_skills=jd.preferred_skills or [],
    )

    ai_summary = generate_candidate_summary(
        {"name": c.name, "skills": c.skills or [], "experience": c.experience or [], "raw_text": c.raw_text or "", "projects": c.projects or []},
        jd_text=jd.description[:400],
    )

    # Upsert score record
    existing = db.query(CandidateScore).filter(
        CandidateScore.candidate_id == c.id,
        CandidateScore.job_description_id == jd.id,
    ).first()

    if existing:
        for k, v in result.items():
            setattr(existing, k, v)
        existing.ai_summary = ai_summary
        db.commit()
        db.refresh(existing)
        score_obj = existing
    else:
        score_obj = CandidateScore(
            candidate_id=c.id,
            job_description_id=jd.id,
            match_score=result["match_score"],
            semantic_score=result["semantic_score"],
            skill_match_score=result["skill_match_score"],
            experience_score=result["experience_score"],
            education_score=result["education_score"],
            hiring_probability=result["hiring_probability"],
            matching_skills=result["matching_skills"],
            missing_skills=result["missing_skills"],
            strengths=result["strengths"],
            weaknesses=result["weaknesses"],
            red_flags=result["red_flags"],
            ai_summary=ai_summary,
        )
        db.add(score_obj)
        db.commit()
        db.refresh(score_obj)

    return {
        **result,
        "ai_summary": ai_summary,
        "candidate": {"id": c.id, "name": c.name, "email": c.email},
        "job": {"id": jd.id, "title": jd.title, "company": jd.company},
        "score_id": score_obj.id,
    }


@router.post("/skill-gap")
def skill_gap(data: SkillGapRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = _get_candidate(db, data.candidate_id, current_user.id)
    jd = _get_jd(db, data.job_description_id, current_user.id)

    gap = compute_skill_gap(c.skills or [], jd.required_skills or [], jd.preferred_skills or [])

    existing = db.query(SkillGap).filter(
        SkillGap.candidate_id == c.id, SkillGap.job_description_id == jd.id
    ).first()
    if existing:
        existing.missing_skills = gap["missing_skills"]
        existing.learning_path = gap["learning_path"]
        db.commit()
    else:
        sg = SkillGap(
            candidate_id=c.id,
            job_description_id=jd.id,
            missing_skills=gap["missing_skills"],
            learning_path=gap["learning_path"],
        )
        db.add(sg)
        db.commit()

    return {
        **gap,
        "candidate": {"id": c.id, "name": c.name},
        "candidate_skills": c.skills or [],
        "required_skills": jd.required_skills or [],
    }


@router.post("/roadmap")
def roadmap(data: RoadmapRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = _get_candidate(db, data.candidate_id, current_user.id)
    jd = _get_jd(db, data.job_description_id, current_user.id)

    gap = compute_skill_gap(c.skills or [], jd.required_skills or [], jd.preferred_skills or [])
    rm = generate_roadmap(
        candidate_name=c.name or "Candidate",
        known_skills=c.skills or [],
        missing_skills=gap["missing_skills"],
        job_title=jd.title,
    )

    existing = db.query(SkillGap).filter(
        SkillGap.candidate_id == c.id, SkillGap.job_description_id == jd.id
    ).first()
    if existing:
        existing.roadmap_30 = rm.get("30_days")
        existing.roadmap_60 = rm.get("60_days")
        existing.roadmap_90 = rm.get("90_days")
        db.commit()
    else:
        sg = SkillGap(
            candidate_id=c.id,
            job_description_id=jd.id,
            missing_skills=gap["missing_skills"],
            learning_path=gap["learning_path"],
            roadmap_30=rm.get("30_days"),
            roadmap_60=rm.get("60_days"),
            roadmap_90=rm.get("90_days"),
        )
        db.add(sg)
        db.commit()

    return {
        **rm,
        "candidate": {"id": c.id, "name": c.name},
        "missing_skills": gap["missing_skills"],
    }


@router.post("/interview-questions")
def interview_questions(data: InterviewQRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = _get_candidate(db, data.candidate_id, current_user.id)
    jd = _get_jd(db, data.job_description_id, current_user.id)

    candidate_data = {
        "name": c.name,
        "skills": c.skills or [],
        "experience": c.experience or [],
        "raw_text": c.raw_text or "",
    }
    questions = generate_interview_questions(
        candidate_data=candidate_data,
        jd_text=jd.description,
        job_title=jd.title,
        difficulty=data.difficulty,
        count=data.count,
    )
    return {
        **questions,
        "candidate": {"id": c.id, "name": c.name},
        "job": {"id": jd.id, "title": jd.title},
    }


@router.post("/compare")
def compare_candidates(data: CompareRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    jd = _get_jd(db, data.job_description_id, current_user.id)
    results = []

    for cid in data.candidate_ids:
        c = db.query(Candidate).filter(Candidate.id == cid, Candidate.owner_id == current_user.id).first()
        if not c:
            continue
        rank_result = rank_candidate(
            candidate_text=c.raw_text or "",
            candidate_skills=c.skills or [],
            jd_text=jd.description,
            jd_required_skills=jd.required_skills or [],
            jd_preferred_skills=jd.preferred_skills or [],
        )
        results.append({
            "candidate_id": c.id,
            "name": c.name,
            "email": c.email,
            "skills": c.skills or [],
            "education": c.education or [],
            "experience": c.experience or [],
            **rank_result,
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return {"job": {"id": jd.id, "title": jd.title}, "comparisons": results}
