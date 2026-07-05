from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    firstName: str
    lastName: str
    role: Optional[str] = "MEMBER"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    firstName: str
    lastName: str
    role: str
    avatarUrl: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True

    @classmethod
    def from_orm_user(cls, user):
        return cls(
            id=user.id,
            email=user.email,
            firstName=user.first_name,
            lastName=user.last_name,
            role=user.role,
            avatarUrl=user.avatar_url,
        )


class AuthResponse(BaseModel):
    message: str
    token: str
    user: UserOut
