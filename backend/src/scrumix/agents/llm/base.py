# LLM base class
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

class BaseLLM(ABC):
    """LLM base class"""
    
    def __init__(self, model_name: str, api_key: str = None):
        self.model_name = model_name
        self.api_key = api_key
    
    @abstractmethod
    async def generate(
        self, 
        prompt: str, 
        max_tokens: int = 1000,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Generate text"""
        pass
    
    @abstractmethod
    async def chat(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 1000,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Conversation generation"""
        pass 