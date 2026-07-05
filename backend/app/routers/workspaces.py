from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_session
from app.core.deps import CurrentUser
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.dashboard import WorkspaceOut

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=list[WorkspaceOut])
async def list_workspaces(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    """Return all workspaces the authenticated user is a member of."""
    memberships_result = await session.execute(
        select(WorkspaceMember).where(WorkspaceMember.user_id == current_user.id)  # type: ignore
    )
    memberships = memberships_result.scalars().all()
    workspace_ids = [m.workspace_id for m in memberships]

    if not workspace_ids:
        return []

    ws_result = await session.execute(
        select(Workspace).where(Workspace.id.in_(workspace_ids))  # type: ignore
    )
    workspaces = ws_result.scalars().all()

    out = []
    for ws in workspaces:
        count_result = await session.execute(
            select(func.count()).where(WorkspaceMember.workspace_id == ws.id)  # type: ignore
        )
        member_count = count_result.scalars().one()
        out.append(
            WorkspaceOut(
                id=ws.id,
                name=ws.name,
                logoUrl=ws.logo_url,
                createdAt=ws.created_at,
                memberCount=member_count,
            )
        )
    return out


@router.get("/{workspace_id}", response_model=WorkspaceOut)
async def get_workspace(
    workspace_id: str,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    ws = await session.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    count_result = await session.execute(
        select(func.count()).where(WorkspaceMember.workspace_id == workspace_id)  # type: ignore
    )
    member_count = count_result.scalars().one()

    return WorkspaceOut(
        id=ws.id,
        name=ws.name,
        logoUrl=ws.logo_url,
        createdAt=ws.created_at,
        memberCount=member_count,
    )
