from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RecordBase(BaseModel):
    problem_id: str
    status: str  # "solving", "solved", "needs_help"
    notes: Optional[str] = None


class RecordCreate(RecordBase):
    pass


class RecordResponse(RecordBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecordUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class UserStatistics(BaseModel):
    user_id: str
    total_problems: int
    solved_problems: int
    average_difficulty: str
    last_activity: datetime
    daily_stats: Optional[list] = None  # 일별 통계
    category_stats: Optional[dict] = None  # 카테고리별 통계
