from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProblemBase(BaseModel):
    recognized_text: str
    problem_type: str  # "handwritten", "printed", etc.


class ProblemCreate(ProblemBase):
    image_path: str


class ProblemResponse(ProblemBase):
    id: str
    user_id: str
    image_path: str
    solution: Optional[str] = None
    similar_problems: Optional[list] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProblemSolution(BaseModel):
    problem_id: str
    solution: str
    explanation: str
    difficulty_level: str  # "easy", "medium", "hard"


class SimilarProblem(BaseModel):
    problem_id: str
    title: str
    difficulty: str
    category: str
