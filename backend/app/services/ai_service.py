import os
import json
import re
from typing import List, Dict, Optional

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

if GEMINI_AVAILABLE and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def _gemini_available() -> bool:
    return GEMINI_AVAILABLE and bool(GEMINI_API_KEY)


def _call_gemini(prompt: str, system: str = "") -> str:
    if not _gemini_available():
        return ""
    model = genai.GenerativeModel("gemini-1.5-flash")
    full_prompt = f"{system}\n\n{prompt}" if system else prompt
    response = model.generate_content(full_prompt)
    return response.text or ""


# ─── Candidate Summary ────────────────────────────────────────────────────────

def generate_candidate_summary(candidate_data: dict, jd_text: str = "") -> str:
    name = candidate_data.get("name", "The candidate")
    skills = ", ".join(candidate_data.get("skills", [])[:12])
    experience = candidate_data.get("raw_text", "")[:600]

    if _gemini_available():
        prompt = f"""Write a concise 3-4 sentence professional recruiter summary for this candidate.
Focus on: key technical skills, relevant experience, and suitability for the role.
Be specific, factual, and professional. Do NOT include generic filler.

Candidate Name: {name}
Skills Detected: {skills}
Resume Excerpt: {experience[:500]}
Job Context: {jd_text[:300]}"""
        result = _call_gemini(prompt, "You are a senior technical recruiter writing candidate evaluation summaries.")
        if result:
            return result.strip()

    # Fallback
    skill_str = ", ".join(candidate_data.get("skills", [])[:8]) or "various technologies"
    exp_list = candidate_data.get("experience", [])
    exp_str = exp_list[0].get("title", "relevant experience") if exp_list else "entry-level experience"
    return (
        f"{name} is a technically proficient candidate with demonstrated skills in {skill_str}. "
        f"Their background includes {exp_str}, making them a potential fit for technical roles. "
        f"The resume shows {len(candidate_data.get('skills', []))} detected technical skills and "
        f"{'strong' if len(candidate_data.get('projects', [])) > 2 else 'developing'} project experience. "
        f"Recommend a technical screening interview to validate depth of expertise."
    )


# ─── Learning Roadmap ─────────────────────────────────────────────────────────

def generate_roadmap(
    candidate_name: str,
    known_skills: List[str],
    missing_skills: List[str],
    job_title: str,
) -> Dict:
    known_str = ", ".join(known_skills[:10]) or "foundational skills"
    missing_str = ", ".join(missing_skills[:8]) or "role-specific tools"

    if _gemini_available():
        prompt = f"""Generate a structured learning roadmap for a candidate targeting the role: {job_title}.

Candidate already knows: {known_str}
Candidate needs to learn: {missing_str}

Return a JSON object with this exact structure:
{{
  "30_days": [
    {{"week": 1, "focus": "topic", "tasks": ["task1", "task2", "task3"], "resources": ["resource1"]}}
  ],
  "60_days": [...same structure, weeks 5-8...],
  "90_days": [...same structure, weeks 9-12...],
  "summary": "2-sentence overview of the roadmap"
}}

Be specific. Reference real courses, books, or platforms. No filler."""

        raw = _call_gemini(prompt, "You are a technical career coach. Return only valid JSON.")
        if raw:
            try:
                clean = re.sub(r"```json|```", "", raw).strip()
                return json.loads(clean)
            except Exception:
                pass

    # Fallback structured roadmap
    return _fallback_roadmap(missing_skills, job_title)


def _fallback_roadmap(missing: List[str], role: str) -> Dict:
    def chunk(lst, n):
        return [lst[i:i+n] for i in range(0, len(lst), n)]

    chunks = chunk(missing, max(1, len(missing) // 3 + 1))
    c1 = chunks[0] if len(chunks) > 0 else missing[:2]
    c2 = chunks[1] if len(chunks) > 1 else missing[2:4]
    c3 = chunks[2] if len(chunks) > 2 else missing[4:]

    def make_weeks(skills, start):
        weeks = []
        for i, skill in enumerate(skills[:4]):
            weeks.append({
                "week": start + i,
                "focus": skill,
                "tasks": [f"Complete foundational {skill} tutorial", f"Build a mini-project using {skill}", f"Review {skill} documentation"],
                "resources": [f"{skill} official docs", "YouTube tutorials", "Practice problems"],
            })
        return weeks

    return {
        "30_days": make_weeks(c1, 1),
        "60_days": make_weeks(c2, 5),
        "90_days": make_weeks(c3, 9),
        "summary": f"This roadmap focuses on bridging the skill gap for a {role} role. "
                   f"Prioritize hands-on practice with real projects to accelerate learning.",
    }


# ─── Interview Questions ───────────────────────────────────────────────────────

def generate_interview_questions(
    candidate_data: dict,
    jd_text: str,
    job_title: str,
    difficulty: str = "mixed",
    count: int = 10,
) -> Dict[str, List]:
    skills = ", ".join(candidate_data.get("skills", [])[:10])
    name = candidate_data.get("name", "the candidate")

    if _gemini_available():
        prompt = f"""Generate {count} interview questions for {name} applying for: {job_title}.

Candidate skills: {skills}
Job context: {jd_text[:500]}
Difficulty: {difficulty}

Return JSON:
{{
  "technical": [
    {{"question": "...", "difficulty": "Easy|Medium|Hard", "topic": "...", "type": "technical"}}
  ],
  "behavioral": [
    {{"question": "...", "difficulty": "Medium", "topic": "...", "type": "behavioral"}}
  ],
  "project": [
    {{"question": "...", "difficulty": "Medium", "topic": "...", "type": "project"}}
  ]
}}

Make questions specific to the candidate's skills and job requirements. No generic filler."""

        raw = _call_gemini(prompt, "You are a senior technical interviewer. Return only valid JSON.")
        if raw:
            try:
                clean = re.sub(r"```json|```", "", raw).strip()
                return json.loads(clean)
            except Exception:
                pass

    return _fallback_questions(candidate_data.get("skills", []), job_title, difficulty)


def _fallback_questions(skills: List[str], role: str, difficulty: str) -> Dict:
    tech_qs = []
    for skill in skills[:4]:
        tech_qs.extend([
            {"question": f"Explain the core concepts of {skill} and how you've used it in production.", "difficulty": "Medium", "topic": skill, "type": "technical"},
            {"question": f"What are common pitfalls when working with {skill}?", "difficulty": "Hard", "topic": skill, "type": "technical"},
        ])
    tech_qs.append({"question": "How do you approach debugging a complex distributed system?", "difficulty": "Hard", "topic": "System Design", "type": "technical"})

    behavioral = [
        {"question": "Tell me about a time you had to learn a new technology quickly under deadline pressure.", "difficulty": "Medium", "topic": "Learning Agility", "type": "behavioral"},
        {"question": "Describe a situation where you disagreed with a technical decision. What did you do?", "difficulty": "Medium", "topic": "Collaboration", "type": "behavioral"},
        {"question": "How do you prioritize tasks when working on multiple projects simultaneously?", "difficulty": "Easy", "topic": "Time Management", "type": "behavioral"},
    ]

    project = [
        {"question": f"Walk me through your most complex project. What was your specific contribution?", "difficulty": "Medium", "topic": "Project Experience", "type": "project"},
        {"question": "What would you do differently if you rebuilt your best project from scratch?", "difficulty": "Hard", "topic": "Technical Reflection", "type": "project"},
    ]

    return {"technical": tech_qs[:6], "behavioral": behavioral, "project": project}


# ─── Recruiter Copilot Chat ───────────────────────────────────────────────────

def chat_with_resume(
    message: str,
    candidate_data: dict,
    chat_history: List[Dict],
) -> str:
    name = candidate_data.get("name", "the candidate")
    skills = ", ".join(candidate_data.get("skills", []))
    resume_text = candidate_data.get("raw_text", "")[:1500]

    if _gemini_available():
        history_str = "\n".join(
            f"{m['role'].upper()}: {m['message']}"
            for m in chat_history[-6:]
        )

        prompt = f"""You are a recruiter copilot with deep knowledge of this candidate's resume.
Answer questions accurately based solely on the resume content. Be concise and professional.

CANDIDATE PROFILE:
Name: {name}
Skills: {skills}
Resume: {resume_text}

CONVERSATION HISTORY:
{history_str}

RECRUITER QUESTION: {message}

Answer specifically and factually. If information is not in the resume, say so clearly."""

        result = _call_gemini(prompt)
        if result:
            return result.strip()

    # Fallback rule-based responses
    msg_lower = message.lower()
    if "skill" in msg_lower or "know" in msg_lower or "proficient" in msg_lower:
        skill_list = ", ".join(candidate_data.get("skills", [])[:10]) or "No skills detected"
        return f"{name}'s detected skills include: {skill_list}."
    if "experience" in msg_lower or "work" in msg_lower or "job" in msg_lower:
        exp = candidate_data.get("experience", [])
        if exp:
            return f"Experience found: {'; '.join(e.get('title','')[:80] for e in exp[:3])}."
        return "No structured work experience was extracted from the resume."
    if "education" in msg_lower or "degree" in msg_lower or "university" in msg_lower:
        edu = candidate_data.get("education", [])
        if edu:
            return f"Education: {'; '.join(e.get('degree','')[:80] for e in edu[:2])}."
        return "No education details were extracted."
    if "project" in msg_lower:
        proj = candidate_data.get("projects", [])
        if proj:
            return f"Projects found: {'; '.join(p.get('description','')[:80] for p in proj[:3])}."
        return "No project details were extracted from the resume."
    if "summar" in msg_lower or "overview" in msg_lower:
        return generate_candidate_summary(candidate_data)
    return (
        f"Based on the resume, {name} has skills in {', '.join(candidate_data.get('skills', [])[:5])}. "
        "Could you clarify what specific aspect you'd like to know more about? "
        "I can answer questions about skills, experience, education, or projects."
    )
