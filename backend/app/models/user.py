from typing import Optional, TYPE_CHECKING
from datetime import datetime, timezone
import uuid

from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.workspace import WorkspaceMember
    from app.models.analytics import AuditLog


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: str = Field(default_factory=_uuid, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str = Field(alias="passwordHash")
    first_name: str = Field(alias="firstName")
    last_name: str = Field(alias="lastName")
    role: str = Field(default="MEMBER")
    avatar_url: Optional[str] = Field(default=None, alias="avatarUrl")
    created_at: datetime = Field(default_factory=_now, alias="createdAt")
    updated_at: datetime = Field(default_factory=_now, alias="updatedAt")

    workspace_members: list["WorkspaceMember"] = Relationship(
        back_populates="user"
    )

    audit_logs: list["AuditLog"] = Relationship(
        back_populates="user"
    )

    class Config:
        populate_by_name = True