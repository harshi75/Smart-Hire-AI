from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    candidates = relationship("Candidate", back_populates="owner")
    job_descriptions = relationship("JobDescription", back_populates="owner")


class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, index=True)
    email = Column(String)
    phone = Column(String)
    education = Column(JSON)
    skills = Column(JSON)
    experience = Column(JSON)
    certifications = Column(JSON)
    projects = Column(JSON)
    raw_text = Column(Text)
    file_path = Column(String)
    file_name = Column(String)
    parse_confidence = Column(Float, default=0.0)
    status = Column(String, default="new")  # new, shortlisted, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner = relationship("User", back_populates="candidates")
    scores = relationship("CandidateScore", back_populates="candidate", cascade="all, delete-orphan")
    skill_gaps = relationship("SkillGap", back_populates="candidate", cascade="all, delete-orphan")
    chat_history = relationship("ChatHistory", back_populates="candidate", cascade="all, delete-orphan")


class JobDescription(Base):
    __tablename__ = "job_descriptions"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    company = Column(String)
    description = Column(Text, nullable=False)
    required_skills = Column(JSON)
    preferred_skills = Column(JSON)
    experience_required = Column(String)
    file_path = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner = relationship("User", back_populates="job_descriptions")
    scores = relationship("CandidateScore", back_populates="job_description", cascade="all, delete-orphan")


class CandidateScore(Base):
    __tablename__ = "candidate_scores"
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    job_description_id = Column(Integer, ForeignKey("job_descriptions.id"))
    match_score = Column(Float)
    skill_match_score = Column(Float)
    experience_score = Column(Float)
    education_score = Column(Float)
    semantic_score = Column(Float)
    hiring_probability = Column(Float)
    matching_skills = Column(JSON)
    missing_skills = Column(JSON)
    strengths = Column(JSON)
    weaknesses = Column(JSON)
    ai_summary = Column(Text)
    red_flags = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    candidate = relationship("Candidate", back_populates="scores")
    job_description = relationship("JobDescription", back_populates="scores")


class SkillGap(Base):
    __tablename__ = "skill_gaps"
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    job_description_id = Column(Integer, ForeignKey("job_descriptions.id"))
    missing_skills = Column(JSON)
    learning_path = Column(JSON)
    roadmap_30 = Column(JSON)
    roadmap_60 = Column(JSON)
    roadmap_90 = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    candidate = relationship("Candidate", back_populates="skill_gaps")


class ChatHistory(Base):
    __tablename__ = "chat_history"
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String)  # user / assistant
    message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    candidate = relationship("Candidate", back_populates="chat_history")
