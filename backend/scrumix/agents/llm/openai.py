import os
import openai
from typing import List, Dict

from .base import BaseLLM

class OpenAILLM(BaseLLM):
    """OpenAI LLM"""

    def __init__(self, model_name: str, api_key: str = None):
        super().__init__(model_name, api_key)

    async def generate(self, prompt: str, max_tokens: int = 1000, temperature: float = 0.7, **kwargs):
        pass
    
    async def chat(self, messages: List[Dict[str, str]], max_tokens: int = 1000, temperature: float = 0.7, **kwargs):
        pass
    
    async def embed(self, text: str, **kwargs):
        pass