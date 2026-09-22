from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from database import get_db
from typing import Optional

router = APIRouter(prefix="/admin", tags=["admin"])


class LLMSettings(BaseModel):
    setting_name: str
    setting_value: str


@router.post("/llm-settings")
async def set_llm_settings(admin_id: str, settings: LLMSettings):
    """LLM 기준 설정"""
    supabase = get_db()
    try:
        result = supabase.table("llm_settings").insert({
            "admin_id": admin_id,
            "setting_name": settings.setting_name,
            "setting_value": settings.setting_value,
        }).execute()

        return result.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/llm-settings")
async def get_llm_settings():
    """LLM 기준 조회"""
    supabase = get_db()
    try:
        result = supabase.table("llm_settings").select("*").execute()
        return result.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/users")
async def get_all_users():
    """모든 사용자 조회"""
    supabase = get_db()
    try:
        result = supabase.table("users").select("*").execute()
        return result.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/users/{user_id}")
async def get_user_details(user_id: str):
    """특정 사용자 상세 정보 조회"""
    supabase = get_db()
    try:
        user_result = supabase.table("users")\
            .select("*")\
            .eq("id", user_id)\
            .execute()

        if not user_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # 사용자의 문제 수
        problems = supabase.table("problems")\
            .select("id")\
            .eq("user_id", user_id)\
            .execute()

        # 사용자의 기록
        records = supabase.table("records")\
            .select("*")\
            .eq("user_id", user_id)\
            .execute()

        return {
            "user": user_result.data[0],
            "total_problems": len(problems.data),
            "records": records.data,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/users/{user_id}")
async def update_user(user_id: str, username: Optional[str] = None, role: Optional[str] = None):
    """사용자 정보 업데이트"""
    supabase = get_db()
    try:
        update_data = {}
        if username:
            update_data["username"] = username
        if role:
            update_data["role"] = role

        result = supabase.table("users")\
            .update(update_data)\
            .eq("id", user_id)\
            .execute()

        return result.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    """사용자 삭제"""
    supabase = get_db()
    try:
        # records 삭제
        supabase.table("records").delete().eq("user_id", user_id).execute()

        # problems 삭제
        supabase.table("problems").delete().eq("user_id", user_id).execute()

        # user 삭제
        result = supabase.table("users").delete().eq("id", user_id).execute()

        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/statistics/all")
async def get_all_statistics():
    """전체 통계 조회"""
    supabase = get_db()
    try:
        users = supabase.table("users").select("id, username, role, created_at").execute()

        stats = []
        for user in users.data:
            problems = supabase.table("problems")\
                .select("id")\
                .eq("user_id", user["id"])\
                .execute()

            solved = supabase.table("records")\
                .select("id")\
                .eq("user_id", user["id"])\
                .eq("status", "solved")\
                .execute()

            stats.append({
                "user_id": user["id"],
                "username": user["username"],
                "role": user["role"],
                "total_problems": len(problems.data),
                "solved_problems": len(solved.data),
                "created_at": user["created_at"],
            })

        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
