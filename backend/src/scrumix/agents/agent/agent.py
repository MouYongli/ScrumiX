# Agent base class
from abc import ABC, abstractmethod
from typing import Any, Dict, List

class BaseAgent(ABC):
    """Agent base class"""
    
    def __init__(self, name: str, description: str = ""):
        self.name = name
        self.description = description
        self.tools = []
        self.memory = None
    
    @abstractmethod
    async def execute(self, task: str, context: Dict[str, Any] = None) -> Any:
        """Execute task"""
        pass
    
    def add_tool(self, tool):
        """Add tool"""
        self.tools.append(tool)
    
    def set_memory(self, memory):
        """Set memory"""
        self.memory = memory 