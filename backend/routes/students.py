from fastapi import APIRouter, HTTPException, status
from models.record import RecordCreate, RecordResponse, RecordUpdate, UserStatistics
from database import get_db

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/records/{user_id}")
async def get_student_records(user_id: str):
    """학생의 문제 풀이 기록 조회"""
    supabase = get_db()
    try:
        result = supabase.table("records")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()

        return result.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/records/{user_id}", response_model=RecordResponse)
async def create_record(user_id: str, record: RecordCreate):
    """문제 풀이 기록 생성"""
    supabase = get_db()
    try:
        result = supabase.table("records").insert({
            "user_id": user_id,
            "problem_id": record.problem_id,
            "status": record.status,
            "notes": record.notes,
        }).execute()

        return RecordResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/records/{record_id}", response_model=RecordResponse)
async def update_record(record_id: str, record: RecordUpdate):
    """문제 풀이 기록 업데이트"""
    supabase = get_db()
    try:
        update_data = {}
        if record.status:
            update_data["status"] = record.status
        if record.notes:
            update_data["notes"] = record.notes

        result = supabase.table("records")\
            .update(update_data)\
            .eq("id", record_id)\
            .execute()

        return RecordResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/statistics/{user_id}")
async def get_user_statistics(user_id: str) -> UserStatistics:
    """학생의 통계 조회"""
    supabase = get_db()
    try:
        # 전체 문제 수
        problems_result = supabase.table("problems")\
            .select("id")\
            .eq("user_id", user_id)\
            .execute()

        # 푼 문제 수
        solved_result = supabase.table("records")\
            .select("id")\
            .eq("user_id", user_id)\
            .eq("status", "solved")\
            .execute()

        return UserStatistics(
            user_id=user_id,
            total_problems=len(problems_result.data),
            solved_problems=len(solved_result.data),
            average_difficulty="medium",
            last_activity="2024-01-01"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
