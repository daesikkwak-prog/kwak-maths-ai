from fastapi import APIRouter, HTTPException, status
from models.user import UserCreate, UserLogin, UserResponse
from database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserResponse)
async def signup(user: UserCreate):
    """회원가입"""
    supabase = get_db()
    try:
        response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
        })

        # users 테이블에 사용자 정보 저장
        supabase.table("users").insert({
            "id": response.user.id,
            "email": user.email,
            "username": user.username,
            "role": user.role,
        }).execute()

        return UserResponse(
            id=response.user.id,
            email=user.email,
            username=user.username,
            role=user.role,
            created_at=response.user.created_at
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login")
async def login(user: UserLogin):
    """로그인"""
    supabase = get_db()
    try:
        response = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password,
        })

        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "user": {
                "id": response.user.id,
                "email": response.user.email,
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )


@router.post("/logout")
async def logout(token: str):
    """로그아웃"""
    supabase = get_db()
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
