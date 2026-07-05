from fastapi import APIRouter, HTTPException, status, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import select
from app.core.database import get_session
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, UserOut
from app.core.deps import CurrentUser
import uuid
import traceback

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, session: AsyncSession = Depends(get_session)):
    try:
        # Check existing email
        result = await session.execute(select(User).where(User.email == body.email))  # type: ignore
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Email already registered")

        user = User(
            id=str(uuid.uuid4()),
            email=body.email,
            password_hash=hash_password(body.password),
            first_name=body.firstName,
            last_name=body.lastName,
            role=body.role or "MEMBER",
            avatar_url=f"https://api.dicebear.com/7.x/initials/svg?seed={body.firstName}%20{body.lastName}",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        token = create_access_token({"userId": user.id, "email": user.email, "role": user.role})
        return AuthResponse(
            message="User registered successfully",
            token=token,
            user=UserOut.from_orm_user(user),
        )
    except Exception as e:
        print("=" * 80)
        print("EXCEPTION IN REGISTER ENDPOINT")
        print(f"Exception Type: {type(e).__name__}")
        print(f"Exception Message: {str(e)}")
        print("TRACEBACK:")
        print(traceback.format_exc())
        print("=" * 80)
        raise


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, session: AsyncSession = Depends(get_session)):
    try:
        email_clean = body.email.strip().lower()
        password_clean = body.password.strip()
        print(f"[API AUTH LOG] Login attempt received for email: {email_clean}", flush=True)
        result = await session.execute(select(User).where(User.email == email_clean))  # type: ignore
        user = result.scalars().first()
 
        if not user:
            print(f"[API AUTH LOG] User '{email_clean}' not found in database!", flush=True)
            raise HTTPException(status_code=400, detail="Invalid email or password")
            
        print(f"[API AUTH LOG] User found. ID: {user.id}", flush=True)
        print(f"[API AUTH LOG] Stored password hash: {user.password_hash}", flush=True)
        print(f"[API AUTH LOG] Received password: {repr(password_clean)} (len: {len(password_clean)})", flush=True)
        
        is_verified = verify_password(password_clean, user.password_hash)
        print(f"[API AUTH LOG] verify_password() result: {is_verified}", flush=True)

        if not is_verified:
            print(f"[API AUTH LOG] Password verification failed for user '{email_clean}'!", flush=True)
            raise HTTPException(status_code=400, detail="Invalid email or password")

        token = create_access_token({"userId": user.id, "email": user.email, "role": user.role})
        return AuthResponse(
            message="Login successful",
            token=token,
            user=UserOut.from_orm_user(user),
        )
    except Exception as e:
        print("=" * 80)
        print("EXCEPTION IN LOGIN ENDPOINT")
        print(f"Exception Type: {type(e).__name__}")
        print(f"Exception Message: {str(e)}")
        print("TRACEBACK:")
        print(traceback.format_exc())
        print("=" * 80)
        raise


@router.get("/me", response_model=UserOut)
async def get_me(current_user: CurrentUser):
    return UserOut.from_orm_user(current_user)
