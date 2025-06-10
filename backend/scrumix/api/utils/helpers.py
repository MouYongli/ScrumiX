# 工具和通用函数
from typing import Any, Dict
import uuid
from datetime import datetime

def generate_uuid() -> str:
    """生成UUID"""
    return str(uuid.uuid4())

def get_current_timestamp() -> datetime:
    """获取当前时间戳"""
    return datetime.utcnow()

def format_response(data: Any = None, message: str = "Success", code: int = 200) -> Dict:
    """格式化API响应"""
    return {
        "code": code,
        "message": message,
        "data": data,
        "timestamp": get_current_timestamp().isoformat()
    } 