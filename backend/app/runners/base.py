import logging
import time
from abc import ABC, abstractmethod
from typing import Any, Dict
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)

class BaseRunner(ABC):
    """
    Abstract base runner providing standardized logger injection,
    performance timing metrics, and DB session injection.
    """
    def __init__(self, session: AsyncSession, config: Dict[str, Any] = None):
        self.session = session
        self.config = config or {}
        self.start_time = None
        self.end_time = None

    @abstractmethod
    async def run(self, *args, **kwargs) -> Any:
        """Execute runner core operation."""
        pass

    def log_event(self, level: int, msg: str):
        """Standardized logger wrapper."""
        logger.log(level, f"[{self.__class__.__name__}] {msg}")

    def start_timing(self):
        """Mark timing sequence start."""
        self.start_time = time.perf_counter()

    def end_timing(self) -> float:
        """Mark timing sequence end and calculate latency."""
        self.end_time = time.perf_counter()
        if self.start_time is None:
            return 0.0
        return self.end_time - self.start_time
