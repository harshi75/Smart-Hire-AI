import re
import numpy as np
from typing import List, Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def semantic_similarity(text1: str, text2: str) -> float:
    try:
        vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
        tfidf = vectorizer.fit_transform([text1[:3000], text2[:3000]])
        sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
        return float(np.clip(sim, 0.0, 1.0))
    except Exception:
        return 0.5


JD_SKILL_PATTERNS = [
    "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust",
    "React", "Vue", "Angular", "Node.js", "FastAPI", "Django", "Flask",
    "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "XGBoost",
    "Pandas", "NumPy", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis",
    "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform",
    "Git", "NLP", "Computer Vision", "Deep Learning", "Machine Learning",
    "Transformers", "BERT", "HuggingFace", "LangChain",
    "Spark", "Kafka", "Airflow", "Snowflake", "BigQuery",
    "Linux", "REST API", "GraphQL", "Microservices",
    "Statistics", "MLOps", "LLM", "RAG", "CI/CD",
    "Polars", "Streamlit", "Jupyter", "HTML", "CSS", "TailwindCSS",
]


def extract_skills_from_jd(jd_text: str) -> Tuple[List[str], List[str]]:
    required = []
    preferred = []
    lines = jd_text.split("\n")
    in_preferred = False
    for line in lines:
        if re.search(r"preferred|nice.to.have|bonus|plus", line, re.IGNORECASE):
            in_preferred = True
        if re.search(r"required|must.have|mandatory", line, re.IGNORECASE):
            in_preferred = False
        for skill in JD_SKILL_PATTERNS:
            if re.search(r"\b" + re.escape(skill.lower()) + r"\b", line.lower()):
                if in_preferred:
                    if skill not in preferred:
                        preferred.append(skill)
                else:
                    if skill not in required:
                        required.append(skill)
    if not required:
        text_lower = jd_text.lower()
        for skill in JD_SKILL_PATTERNS:
            if re.search(r"\b" + re.escape(skill.lower()) + r"\b", text_lower):
                if skill not in required:
                    required.append(skill)
    return required, preferred


def rank_candidate(
    candidate_text: str,
    candidate_skills: List[str],
    jd_text: str,
    jd_required_skills: List[str],
    jd_preferred_skills: List[str],
) -> Dict[str, Any]:
    semantic_score = semantic_similarity(candidate_text, jd_text)

    c_skills_lower = [s.lower() for s in candidate_skills]
    matching_required = [s for s in jd_required_skills if s.lower() in c_skills_lower]
    missing_required = [s for s in jd_required_skills if s.lower() not in c_skills_lower]
    matching_preferred = [s for s in jd_preferred_skills if s.lower() in c_skills_lower]
    all_matching = list(set(matching_required + matching_preferred))
    all_missing = [s for s in jd_required_skills + jd_preferred_skills if s.lower() not in c_skills_lower]

    req_score = (len(matching_required) / len(jd_required_skills)) if jd_required_skills else 0.5
    pref_score = (len(matching_preferred) / len(jd_preferred_skills)) if jd_preferred_skills else 0.5
    skill_score = 0.8 * req_score + 0.2 * pref_score

    edu_score = 0.7
    if any(k in candidate_text.lower() for k in ["phd", "doctorate"]):
        edu_score = 1.0
    elif any(k in candidate_text.lower() for k in ["master", "m.tech", "msc", "mba"]):
        edu_score = 0.9
    elif any(k in candidate_text.lower() for k in ["bachelor", "b.tech", "bsc", "b.e"]):
        edu_score = 0.75

    exp_score = 0.5
    years_match = re.findall(r"(\d+)\+?\s*years?", candidate_text.lower())
    if years_match:
        years = max(int(y) for y in years_match)
        exp_score = min(years / 8.0, 1.0)

    match_score = (
        0.45 * semantic_score +
        0.35 * skill_score +
        0.10 * edu_score +
        0.10 * exp_score
    )
    match_score = round(match_score * 100, 1)
    hiring_prob = round(0.4 * skill_score + 0.3 * semantic_score + 0.15 * edu_score + 0.15 * exp_score, 2)

    strengths = []
    weaknesses = []
    if skill_score >= 0.7: strengths.append("Strong skill alignment with job requirements")
    if semantic_score >= 0.6: strengths.append("Highly relevant background and experience")
    if edu_score >= 0.85: strengths.append("Advanced educational qualification")
    if exp_score >= 0.5: strengths.append("Solid hands-on experience")
    if len(candidate_skills) >= 10: strengths.append("Broad technical skill set")
    if skill_score < 0.4: weaknesses.append("Significant skill gaps for this role")
    if missing_required: weaknesses.append(f"Missing key required skills: {', '.join(missing_required[:3])}")
    if exp_score < 0.3: weaknesses.append("Limited industry experience")
    if semantic_score < 0.4: weaknesses.append("Profile does not closely match job context")

    red_flags = []
    if not matching_required and jd_required_skills:
        red_flags.append("No required skills detected")
    if len(candidate_skills) < 3:
        red_flags.append("Very few technical skills detected")
    if exp_score < 0.15:
        red_flags.append("No work experience detected")

    return {
        "match_score": match_score,
        "semantic_score": round(semantic_score * 100, 1),
        "skill_match_score": round(skill_score * 100, 1),
        "experience_score": round(exp_score * 100, 1),
        "education_score": round(edu_score * 100, 1),
        "hiring_probability": round(hiring_prob * 100, 1),
        "matching_skills": all_matching,
        "missing_skills": list(set(all_missing)),
        "strengths": strengths,
        "weaknesses": weaknesses,
        "red_flags": red_flags,
    }


def compute_skill_gap(candidate_skills: List[str], jd_required: List[str], jd_preferred: List[str]) -> Dict:
    c_lower = [s.lower() for s in candidate_skills]
    missing = [s for s in jd_required + jd_preferred if s.lower() not in c_lower]
    missing = list(dict.fromkeys(missing))
    learning_path = []
    for skill in missing[:8]:
        res = RESOURCE_MAP.get(skill, {"resource": "Official documentation and tutorials", "time": "2-4 weeks"})
        learning_path.append({"skill": skill, **res})
    return {"missing_skills": missing, "learning_path": learning_path}


RESOURCE_MAP = {
    "Docker": {"resource": "Docker official docs + Play with Docker", "time": "1 week"},
    "Kubernetes": {"resource": "KodeKloud Kubernetes course", "time": "2 weeks"},
    "AWS": {"resource": "AWS Skill Builder", "time": "4 weeks"},
    "GCP": {"resource": "Google Cloud Skills Boost", "time": "4 weeks"},
    "Azure": {"resource": "Microsoft Learn Azure Fundamentals", "time": "3 weeks"},
    "MLOps": {"resource": "Made With ML MLOps course", "time": "3 weeks"},
    "Airflow": {"resource": "Astronomer Airflow fundamentals", "time": "1 week"},
    "Kafka": {"resource": "Confluent Kafka fundamentals", "time": "2 weeks"},
    "Spark": {"resource": "Databricks Academy Apache Spark", "time": "3 weeks"},
    "TensorFlow": {"resource": "TensorFlow Developer Certificate prep", "time": "4 weeks"},
    "PyTorch": {"resource": "fast.ai Practical Deep Learning", "time": "4 weeks"},
    "HuggingFace": {"resource": "HuggingFace NLP course", "time": "2 weeks"},
    "LangChain": {"resource": "LangChain docs + DeepLearning.AI", "time": "1 week"},
    "React": {"resource": "React official docs + Frontend Masters", "time": "3 weeks"},
    "PostgreSQL": {"resource": "PostgreSQL Tutorial", "time": "2 weeks"},
    "Redis": {"resource": "Redis University free courses", "time": "1 week"},
    "Statistics": {"resource": "Khan Academy Statistics + StatQuest", "time": "4 weeks"},
    "NLP": {"resource": "Stanford CS224N + HuggingFace NLP course", "time": "6 weeks"},
    "RAG": {"resource": "LangChain RAG documentation", "time": "1 week"},
}
