# 日志工具
import logging
import sys
from typing import Optional

def setup_logger(
    name: str,
    level: int = logging.INFO,
    format_string: Optional[str] = None
) -> logging.Logger:
    """设置日志器"""
    
    if format_string is None:
        format_string = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # 创建日志器
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # 创建控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    
    # 创建格式器
    formatter = logging.Formatter(format_string)
    console_handler.setFormatter(formatter)
    
    # 添加处理器到日志器
    if not logger.handlers:
        logger.addHandler(console_handler)
    
    return logger

# 默认日志器
logger = setup_logger("scrumix.agents") 