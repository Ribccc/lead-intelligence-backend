from typing import Optional, TYPE_CHECKING
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Relationship
import uuid

if TYPE_CHECKING:
    from app.models.workspace import Workspace


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Pipeline(SQLModel, table=True):
    __tablename__ = "pipelines"

    id: str = Field(default_factory=_uuid, primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    name: str
    is_active: bool = Field(default=False)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    workspace: Optional["Workspace"] = Relationship(
        back_populates="pipelines"
    )

    nodes: list["PipelineNode"] = Relationship(
        back_populates="pipeline"
    )

    edges: list["PipelineEdge"] = Relationship(
        back_populates="pipeline"
    )


class PipelineNode(SQLModel, table=True):
    __tablename__ = "pipeline_nodes"

    id: str = Field(default_factory=_uuid, primary_key=True)
    pipeline_id: str = Field(foreign_key="pipelines.id", index=True)
    type: str
    name: str
    config: str = Field(default="{}")
    status: str = Field(default="IDLE")
    throughput: float = Field(default=0.0)
    processed: int = Field(default=0)
    x: float = Field(default=0.0)
    y: float = Field(default=0.0)

    pipeline: Optional["Pipeline"] = Relationship(
        back_populates="nodes"
    )


class PipelineEdge(SQLModel, table=True):
    __tablename__ = "pipeline_edges"

    id: str = Field(default_factory=_uuid, primary_key=True)
    pipeline_id: str = Field(foreign_key="pipelines.id", index=True)
    source_node_id: str
    target_node_id: str

    pipeline: Optional["Pipeline"] = Relationship(
        back_populates="edges"
    )