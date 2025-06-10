# 代理基类
from abc import ABC, abstractmethod
from typing import Any, Dict, List

class BaseAgent(ABC):
    """代理基类"""
    
    def __init__(self, name: str, description: str = ""):
        self.name = name
        self.description = description
        self.tools = []
        self.memory = None
    
    @abstractmethod
    async def execute(self, task: str, context: Dict[str, Any] = None) -> Any:
        """执行任务"""
        pass
    
    def add_tool(self, tool):
        """添加工具"""
        self.tools.append(tool)
    
    def set_memory(self, memory):
        """设置记忆"""
        self.memory = memory 