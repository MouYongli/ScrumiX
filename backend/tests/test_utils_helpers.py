"""
Tests for helper utility functions
"""
import pytest
import uuid
from datetime import datetime

from scrumix.api.utils.helpers import (
    generate_unique_id,
    format_datetime,
    sanitize_string,
    validate_email,
    truncate_text
)


class TestHelperUtils:
    """Test helper utility functions"""

    def test_generate_unique_id(self):
        """Test unique ID generation"""
        # Generate multiple IDs
        id1 = generate_unique_id()
        id2 = generate_unique_id()
        
        # Check they are different
        assert id1 != id2
        
        # Check they are valid UUIDs
        uuid.UUID(id1)  # Should not raise exception
        uuid.UUID(id2)  # Should not raise exception
        
        # Check format
        assert isinstance(id1, str)
        assert len(id1) == 36  # Standard UUID length with hyphens

    def test_format_datetime(self):
        """Test datetime formatting"""
        dt = datetime(2024, 1, 15, 14, 30, 45)
        
        # Test default format
        result = format_datetime(dt)
        assert result == "2024-01-15 14:30:45"
        
        # Test custom format
        result = format_datetime(dt, "%Y-%m-%d")
        assert result == "2024-01-15"
        
        # Test another custom format
        result = format_datetime(dt, "%H:%M:%S")
        assert result == "14:30:45"

    def test_sanitize_string(self):
        """Test string sanitization"""
        # Test script tag removal
        dirty = "<script>alert('xss')</script>Hello"
        clean = sanitize_string(dirty)
        assert clean == "Hello"
        
        # Test HTML tag removal
        dirty = "<div>Hello <strong>World</strong></div>"
        clean = sanitize_string(dirty)
        assert clean == "Hello World"
        
        # Test mixed case script tags
        dirty = "<SCRIPT>alert('xss')</SCRIPT>Safe"
        clean = sanitize_string(dirty)
        assert clean == "Safe"
        
        # Test clean text
        clean_text = "This is clean text"
        result = sanitize_string(clean_text)
        assert result == clean_text
        
        # Test whitespace stripping
        dirty = "  <p>Text</p>  "
        clean = sanitize_string(dirty)
        assert clean == "Text"

    def test_validate_email(self):
        """Test email validation"""
        # Valid emails
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "test+tag@gmail.com",
            "test123@test-domain.org",
            "user_name@domain.info",
            "first.last@subdomain.example.com"
        ]
        
        for email in valid_emails:
            assert validate_email(email), f"Should be valid: {email}"
        
        # Invalid emails
        invalid_emails = [
            "",  # Empty
            "notanemail",  # No @
            "@domain.com",  # No local part
            "user@",  # No domain
            "user@domain",  # No TLD
            "user..name@domain.com",  # Consecutive dots in local
            "user@domain..com",  # Consecutive dots in domain
            ".user@domain.com",  # Leading dot in local
            "user.@domain.com",  # Trailing dot in local
            "user@.domain.com",  # Leading dot in domain
            "user@domain.com.",  # Trailing dot in domain
            "a" * 65 + "@domain.com",  # Local part too long
            "user@" + "a" * 256 + ".com",  # Domain too long
            "user@domain.c",  # TLD too short
            "user name@domain.com",  # Space in local part
            "user@domain com",  # Space in domain
        ]
        
        for email in invalid_emails:
            assert not validate_email(email), f"Should be invalid: {email}"
        
        # Edge cases
        assert not validate_email(None)  # None input
        assert not validate_email("a" * 255)  # Too long overall

    def test_truncate_text(self):
        """Test text truncation"""
        # Text shorter than limit
        short_text = "Hello World"
        result = truncate_text(short_text, 20)
        assert result == short_text
        
        # Text exactly at limit
        exact_text = "a" * 10
        result = truncate_text(exact_text, 10)
        assert result == exact_text
        
        # Text longer than limit
        long_text = "This is a very long text that should be truncated"
        result = truncate_text(long_text, 20)
        assert result == "This is a very lo..."
        assert len(result) == 20
        
        # Default limit
        very_long_text = "a" * 150
        result = truncate_text(very_long_text)
        assert result == "a" * 97 + "..."
        assert len(result) == 100
        
        # Very short limit
        result = truncate_text("Hello World", 5)
        assert result == "He..."
        assert len(result) == 5 