"""
Helper utility functions for the API
"""
import uuid
import re
from datetime import datetime
from typing import Optional


def generate_unique_id() -> str:
    """Generate a unique identifier"""
    return str(uuid.uuid4())


def format_datetime(dt: datetime, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Format datetime to string"""
    return dt.strftime(format_str)


def sanitize_string(text: str) -> str:
    """Sanitize string by removing potentially dangerous content"""
    # Remove script tags and other potentially dangerous HTML
    clean_text = re.sub(r'<script.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
    clean_text = re.sub(r'<.*?>', '', clean_text)
    return clean_text.strip()


def validate_email(email: str) -> bool:
    """
    Validate email format with comprehensive rules.
    
    Rules:
    1. Basic email format (user@domain.tld)
    2. No consecutive dots in local or domain part
    3. Valid characters in local part
    4. Valid domain format
    5. Proper TLD length
    6. No leading/trailing dots
    """
    if not email or len(email) > 254:  # RFC 5321
        return False
        
    # Split into local and domain parts
    try:
        local, domain = email.split('@')
    except ValueError:
        return False
        
    # Check local part
    if not local or len(local) > 64:  # RFC 5321
        return False
    if '..' in local:  # No consecutive dots
        return False
    if local[0] == '.' or local[-1] == '.':  # No leading/trailing dots
        return False
        
    # Check domain part
    if not domain or len(domain) > 255:
        return False
    if '..' in domain:  # No consecutive dots
        return False
    if domain[0] == '.' or domain[-1] == '.':  # No leading/trailing dots
        return False
    if not re.match(r'^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', domain):  # Valid domain format
        return False
        
    # Final comprehensive check
    pattern = r'^[a-zA-Z0-9.!#$%&\'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
    return bool(re.match(pattern, email))


def truncate_text(text: str, max_length: int = 100) -> str:
    """Truncate text to specified length"""
    if len(text) <= max_length:
        return text
    return text[:max_length-3] + "..." 