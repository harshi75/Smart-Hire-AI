from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from collections import Counter

from app.database.db import get_db
from app.models.models import User, Candidate, JobDescription, CandidateScore
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = db.query(Candidate).filter(Candidate.owner_id == current_user.id).count()
    shortlisted = db.query(Candidate).filter(Candidate.owner_id == current_user.id, Candidate.status == "shortlisted").count()
    rejected = db.query(Candidate).filter(Candidate.owner_id == current_user.id, Candidate.status == "rejected").count()
    interview = db.query(Candidate).filter(Candidate.owner_id == current_user.id, Candidate.status == "interview").count()
    new_count = db.query(Candidate).filter(Candidate.owner_id == current_user.id, Candidate.status == "new").count()

    avg_score_row = db.query(func.avg(CandidateScore.match_score)).join(
        Candidate, CandidateScore.candidate_id == Candidate.id
    ).filter(Candidate.owner_id == current_user.id).scalar()
    avg_score = round(float(avg_score_row), 1) if avg_score_row else 0.0

    # Top skills across all candidates
    all_candidates = db.query(Candidate).filter(Candidate.owner_id == current_user.id).all()
    skill_counter = Counter()
    for c in all_candidates:
        for skill in (c.skills or []):
            skill_counter[skill] += 1
    top_skills = [{"skill": s, "count": cnt} for s, cnt in skill_counter.most_common(15)]

    # Candidate score distribution
    scores = db.query(CandidateScore.match_score, CandidateScore.candidate_id).join(
        Candidate, CandidateScore.candidate_id == Candidate.id
    ).filter(Candidate.owner_id == current_user.id).all()

    score_dist = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    for row in scores:
        s = row.match_score or 0
        if s <= 20: score_dist["0-20"] += 1
        elif s <= 40: score_dist["21-40"] += 1
        elif s <= 60: score_dist["41-60"] += 1
        elif s <= 80: score_dist["61-80"] += 1
        else: score_dist["81-100"] += 1

    # Top candidates
    top_candidates = db.query(
        Candidate.id, Candidate.name, Candidate.email,
        func.max(CandidateScore.match_score).label("best_score")
    ).join(CandidateScore, CandidateScore.candidate_id == Candidate.id, isouter=True
    ).filter(Candidate.owner_id == current_user.id
    ).group_by(Candidate.id, Candidate.name, Candidate.email
    ).order_by(func.max(CandidateScore.match_score).desc()
    ).limit(5).all()

    top_candidates_data = [
        {"id": row.id, "name": row.name, "email": row.email, "score": round(float(row.best_score or 0), 1)}
        for row in top_candidates
    ]

    # Jobs count
    total_jobs = db.query(JobDescription).filter(JobDescription.owner_id == current_user.id).count()

    # Monthly trend (last 6 months)
    from sqlalchemy import extract
    from datetime import datetime, timedelta
    monthly = []
    for i in range(5, -1, -1):
        dt = datetime.utcnow() - timedelta(days=30 * i)
        cnt = db.query(Candidate).filter(
            Candidate.owner_id == current_user.id,
            extract("year", Candidate.created_at) == dt.year,
            extract("month", Candidate.created_at) == dt.month,
        ).count()
        monthly.append({"month": dt.strftime("%b %Y"), "count": cnt})

    return {
        "overview": {
            "total_candidates": total,
            "shortlisted": shortlisted,
            "rejected": rejected,
            "interview": interview,
            "new": new_count,
            "average_score": avg_score,
            "total_jobs": total_jobs,
        },
        "top_skills": top_skills,
        "score_distribution": [{"range": k, "count": v} for k, v in score_dist.items()],
        "top_candidates": top_candidates_data,
        "monthly_trend": monthly,
    }
