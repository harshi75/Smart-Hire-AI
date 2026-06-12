from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime


# Auth
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# Candidate
class CandidateOut(BaseModel):
    id: int
    name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    skills: Optional[List[str]]
    education: Optional[List[Dict]]
    experience: Optional[List[Dict]]
    certifications: Optional[List[str]]
    projects: Optional[List[Dict]]
    parse_confidence: Optional[float]
    status: Optional[str]
    file_name: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class CandidateStatusUpdate(BaseModel):
    status: str


# Job Description
class JobDescriptionCreate(BaseModel):
    title: str
    company: Optional[str] = ""
    description: str

class JobDescriptionOut(BaseModel):
    id: int
    title: str
    company: Optional[str]
    description: str
    required_skills: Optional[List[str]]
    created_at: datetime
    class Config:
        from_attributes = True


# Analysis
class RankRequest(BaseModel):
    candidate_id: int
    job_description_id: int

class SkillGapRequest(BaseModel):
    candidate_id: int
    job_description_id: int

class RoadmapRequest(BaseModel):
    candidate_id: int
    job_description_id: int

class InterviewQRequest(BaseModel):
    candidate_id: int
    job_description_id: int
    difficulty: Optional[str] = "mixed"  # easy, medium, hard, mixed
    count: Optional[int] = 10

class CompareRequest(BaseModel):
    candidate_ids: List[int]
    job_description_id: int


# Chat
class ChatRequest(BaseModel):
    candidate_id: int
    message: str

class ChatMessageOut(BaseModel):
    role: str
    message: str
    created_at: datetime
    class Config:
        from_attributes = True
