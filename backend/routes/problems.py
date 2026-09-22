from fastapi import APIRouter, File, UploadFile, HTTPException, status, Depends
from models.problem import ProblemCreate, ProblemResponse
from database import get_db
from typing import Optional
import os

router = APIRouter(prefix="/problems", tags=["problems"])


@router.post("/upload", response_model=ProblemResponse)
async def upload_problem(
    file: UploadFile = File(...),
    user_id: str = None
):
    """이미지로 문제 업로드"""
    supabase = get_db()
    try:
        # 이미지 저장
        contents = await file.read()
        file_path = f"problems/{user_id}/{file.filename}"

        # Supabase Storage에 업로드
        supabase.storage.from_("math-problems").upload(
            file_path,
            contents,
            {"content-type": file.content_type}
        )

        # DB에 기록 저장
        result = supabase.table("problems").insert({
            "user_id": user_id,
            "image_path": file_path,
            "recognized_text": "",  # Gemini Vision으로 나중에 처리
            "problem_type": "handwritten"
        }).execute()

        return ProblemResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/list/{user_id}")
async def get_user_problems(user_id: str):
    """사용자의 모든 문제 조회"""
    supabase = get_db()
    try:
        result = supabase.table("problems")\
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


@router.get("/{problem_id}")
async def get_problem(problem_id: str):
    """특정 문제 조회"""
    supabase = get_db()
    try:
        result = supabase.table("problems")\
            .select("*")\
            .eq("id", problem_id)\
            .execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )

        return result.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{problem_id}")
async def update_problem(problem_id: str, recognized_text: str, solution: Optional[str] = None):
    """문제 풀이 업데이트"""
    supabase = get_db()
    try:
        update_data = {
            "recognized_text": recognized_text,
        }
        if solution:
            update_data["solution"] = solution

        result = supabase.table("problems")\
            .update(update_data)\
            .eq("id", problem_id)\
            .execute()

        return result.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
