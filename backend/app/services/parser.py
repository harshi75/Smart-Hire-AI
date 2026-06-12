import re
import io
from typing import Dict, Any, Optional
import pdfplumber
import PyPDF2
from docx import Document


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception:
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                text += page.extract_text() + "\n"
        except Exception as e:
            raise ValueError(f"Could not parse PDF: {e}")
    return text


def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = filename.lower().split(".")[-1]
    if ext == "pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext in ("docx", "doc"):
        return extract_text_from_docx(file_bytes)
    elif ext == "txt":
        return file_bytes.decode("utf-8", errors="ignore")
    else:
        raise ValueError(f"Unsupported file type: {ext}")


# ─── Resume Parser ────────────────────────────────────────────────────────────

SKILL_KEYWORDS = [
    "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust", "Kotlin", "Swift",
    "React", "Vue", "Angular", "Node.js", "FastAPI", "Django", "Flask", "Spring", "Express",
    "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "XGBoost", "LightGBM", "CatBoost",
    "Pandas", "NumPy", "Matplotlib", "Seaborn", "Plotly", "SciPy",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "SQLite",
    "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "Ansible",
    "Git", "GitHub", "GitLab", "CI/CD", "Jenkins", "GitHub Actions",
    "NLP", "Computer Vision", "Deep Learning", "Machine Learning", "LLM", "RAG", "MLOps",
    "Transformers", "BERT", "GPT", "HuggingFace", "LangChain", "OpenAI",
    "Spark", "Hadoop", "Kafka", "Airflow", "dbt", "Snowflake", "BigQuery",
    "Linux", "Bash", "REST API", "GraphQL", "gRPC", "Microservices",
    "HTML", "CSS", "TailwindCSS", "Bootstrap", "SASS",
    "Statistics", "Linear Algebra", "Calculus", "Probability",
    "Polars", "Streamlit", "Gradio", "Weights & Biases", "MLflow",
    "Selenium", "Pytest", "Jest", "Jupyter",
]


def parse_resume(text: str) -> Dict[str, Any]:
    parsed = {
        "name": _extract_name(text),
        "email": _extract_email(text),
        "phone": _extract_phone(text),
        "skills": _extract_skills(text),
        "education": _extract_education(text),
        "experience": _extract_experience(text),
        "certifications": _extract_certifications(text),
        "projects": _extract_projects(text),
    }
    parsed["parse_confidence"] = _compute_confidence(parsed)
    return parsed


def _extract_name(text: str) -> Optional[str]:
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines[:5]:
        if re.match(r"^[A-Z][a-z]+ ([A-Z][a-z]+\s?)+$", line):
            return line
    # Fallback: first non-email, non-phone line
    for line in lines[:3]:
        if "@" not in line and not re.search(r"\d{7,}", line) and len(line.split()) <= 5:
            return line
    return lines[0] if lines else None


def _extract_email(text: str) -> Optional[str]:
    match = re.search(r"[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}", text)
    return match.group(0) if match else None


def _extract_phone(text: str) -> Optional[str]:
    match = re.search(r"(\+?\d[\d\s\-().]{7,15}\d)", text)
    return match.group(0).strip() if match else None


def _extract_skills(text: str) -> list:
    found = []
    text_lower = text.lower()
    for skill in SKILL_KEYWORDS:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower):
            found.append(skill)
    return found


def _extract_education(text: str) -> list:
    edu = []
    patterns = [
        r"(B\.?Tech|M\.?Tech|B\.?Sc|M\.?Sc|PhD|Bachelor|Master|MBA|B\.?E\.?|M\.?E\.?)[^\n]{0,100}",
        r"(University|College|Institute|School)[^\n]{0,80}",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            line = match.group(0).strip()
            if line not in [e.get("degree", "") for e in edu]:
                edu.append({"degree": line})
    return edu[:4]


def _extract_experience(text: str) -> list:
    exp = []
    pattern = r"(intern|engineer|developer|scientist|analyst|manager|lead|architect)[^\n]{0,120}"
    for match in re.finditer(pattern, text, re.IGNORECASE):
        line = match.group(0).strip()
        if len(line) > 20:
            exp.append({"title": line[:120]})
    return exp[:6]


def _extract_certifications(text: str) -> list:
    certs = []
    pattern = r"(certified|certification|certificate|AWS|GCP|Azure|Google)[^\n]{0,80}"
    for match in re.finditer(pattern, text, re.IGNORECASE):
        cert = match.group(0).strip()
        if cert not in certs and len(cert) > 10:
            certs.append(cert)
    return certs[:5]


def _extract_projects(text: str) -> list:
    projects = []
    pattern = r"(?:project|built|developed|created|designed)[^\n]{0,150}"
    for match in re.finditer(pattern, text, re.IGNORECASE):
        project = match.group(0).strip()
        if len(project) > 20:
            projects.append({"description": project[:150]})
    return projects[:6]


def _compute_confidence(parsed: dict) -> float:
    score = 0.0
    if parsed.get("name"):
        score += 0.2
    if parsed.get("email"):
        score += 0.2
    if parsed.get("skills") and len(parsed["skills"]) >= 3:
        score += 0.25
    if parsed.get("education"):
        score += 0.15
    if parsed.get("experience"):
        score += 0.15
    if parsed.get("projects"):
        score += 0.05
    return round(score, 2)
