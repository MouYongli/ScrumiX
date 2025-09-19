"""
Tests for cookie utility functions
"""
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from fastapi import Response, Request

from scrumix.api.utils.cookies import (
    set_session_cookie,
    get_session_cookie,
    clear_session_cookie,
    set_access_token_cookie,
    set_refresh_token_cookie,
    get_access_token_from_cookie,
    get_refresh_token_from_cookie,
    clear_auth_cookies,
    create_auth_cookie,
    parse_auth_cookie
)


class TestCookieUtils:
    """Test cookie utility functions"""

    def test_set_session_cookie_basic(self):
        """Test basic session cookie setting"""
        response = MagicMock(spec=Response)
        
        set_session_cookie(response, "test_key", "test_value")
        
        response.set_cookie.assert_called_once()
        call_args = response.set_cookie.call_args[1]
        assert call_args["key"] == "test_key"
        assert call_args["value"] == "test_value"
        assert call_args["httponly"] is True
        assert call_args["path"] == "/"

    def test_set_session_cookie_with_expiry(self):
        """Test session cookie with expiration"""
        response = MagicMock(spec=Response)
        expires_delta = timedelta(hours=1)
        
        set_session_cookie(response, "test_key", "test_value", expires_delta)
        
        response.set_cookie.assert_called_once()
        call_args = response.set_cookie.call_args[1]
        assert call_args["max_age"] == 3600  # 1 hour in seconds
        assert call_args["expires"] is not None

    def test_set_session_cookie_not_httponly(self):
        """Test session cookie with httponly=False"""
        response = MagicMock(spec=Response)
        
        set_session_cookie(response, "test_key", "test_value", httponly=False)
        
        response.set_cookie.assert_called_once()
        call_args = response.set_cookie.call_args[1]
        assert call_args["httponly"] is False

    def test_get_session_cookie_exists(self):
        """Test getting existing session cookie"""
        request = MagicMock(spec=Request)
        request.cookies = {"test_key": "test_value"}
        
        result = get_session_cookie(request, "test_key")
        
        assert result == "test_value"

    def test_get_session_cookie_not_exists(self):
        """Test getting non-existent session cookie"""
        request = MagicMock(spec=Request)
        request.cookies = {}
        
        result = get_session_cookie(request, "missing_key")
        
        assert result is None

    def test_clear_session_cookie(self):
        """Test clearing session cookie"""
        response = MagicMock(spec=Response)
        
        clear_session_cookie(response, "test_key")
        
        response.set_cookie.assert_called_once()
        call_args = response.set_cookie.call_args[1]
        assert call_args["key"] == "test_key"
        assert call_args["value"] == ""
        assert call_args["max_age"] == 0
        assert call_args["httponly"] is True

    @patch('scrumix.api.utils.cookies.set_session_cookie')
    def test_set_access_token_cookie(self, mock_set_session):
        """Test setting access token cookie"""
        response = MagicMock(spec=Response)
        token = "access_token_123"
        expires_delta = timedelta(minutes=30)
        
        set_access_token_cookie(response, token, expires_delta)
        
        mock_set_session.assert_called_once()
        args = mock_set_session.call_args[0]
        kwargs = mock_set_session.call_args[1]
        assert args[0] == response
        assert args[2] == token
        assert args[3] == expires_delta
        assert kwargs["httponly"] is True

    @patch('scrumix.api.utils.cookies.set_session_cookie')
    def test_set_refresh_token_cookie(self, mock_set_session):
        """Test setting refresh token cookie"""
        response = MagicMock(spec=Response)
        token = "refresh_token_456"
        expires_delta = timedelta(days=7)
        
        set_refresh_token_cookie(response, token, expires_delta)
        
        mock_set_session.assert_called_once()
        args = mock_set_session.call_args[0]
        kwargs = mock_set_session.call_args[1]
        assert args[0] == response
        assert args[2] == token
        assert args[3] == expires_delta
        assert kwargs["httponly"] is True

    @patch('scrumix.api.utils.cookies.get_session_cookie')
    def test_get_access_token_from_cookie(self, mock_get_session):
        """Test getting access token from cookie"""
        request = MagicMock(spec=Request)
        mock_get_session.return_value = "access_token_789"
        
        result = get_access_token_from_cookie(request)
        
        mock_get_session.assert_called_once()
        args = mock_get_session.call_args[0]
        assert args[0] == request
        assert result == "access_token_789"

    @patch('scrumix.api.utils.cookies.get_session_cookie')
    def test_get_refresh_token_from_cookie(self, mock_get_session):
        """Test getting refresh token from cookie"""
        request = MagicMock(spec=Request)
        mock_get_session.return_value = "refresh_token_abc"
        
        result = get_refresh_token_from_cookie(request)
        
        mock_get_session.assert_called_once()
        args = mock_get_session.call_args[0]
        assert args[0] == request
        assert result == "refresh_token_abc"

    @patch('scrumix.api.utils.cookies.clear_session_cookie')
    def test_clear_auth_cookies(self, mock_clear_session):
        """Test clearing all auth cookies"""
        response = MagicMock(spec=Response)
        
        clear_auth_cookies(response)
        
        assert mock_clear_session.call_count == 2  # Access + refresh
        calls = mock_clear_session.call_args_list
        assert calls[0][0][0] == response  # First call with response
        assert calls[1][0][0] == response  # Second call with response

    def test_create_auth_cookie(self):
        """Test creating auth cookie string"""
        token = "test_token_123"
        
        result = create_auth_cookie(token)
        
        assert result == "auth_token=test_token_123; Path=/; HttpOnly"

    def test_parse_auth_cookie_exists(self):
        """Test parsing auth cookie when it exists"""
        request = MagicMock()
        request.cookies = {"auth_token": "parsed_token_456"}
        
        result = parse_auth_cookie(request)
        
        assert result == "parsed_token_456"

    def test_parse_auth_cookie_not_exists(self):
        """Test parsing auth cookie when it doesn't exist"""
        request = MagicMock()
        request.cookies = {}
        
        result = parse_auth_cookie(request)
        
        assert result is None

    def test_parse_auth_cookie_no_cookies_attr(self):
        """Test parsing auth cookie when no cookies attribute"""
        request = MagicMock()
        # Remove cookies attribute
        if hasattr(request, 'cookies'):
            delattr(request, 'cookies')
        
        result = parse_auth_cookie(request)
        
        assert result is None

    def test_set_session_cookie_with_datetime_calculation(self):
        """Test session cookie with datetime calculation"""
        response = MagicMock(spec=Response)
        expires_delta = timedelta(minutes=15)
        
        with patch('scrumix.api.utils.cookies.datetime') as mock_datetime:
            mock_now = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
            mock_datetime.now.return_value = mock_now
            
            set_session_cookie(response, "test_key", "test_value", expires_delta)
            
            response.set_cookie.assert_called_once()
            call_args = response.set_cookie.call_args[1]
            assert call_args["max_age"] == 900  # 15 minutes in seconds

    def test_clear_session_cookie_with_datetime(self):
        """Test clearing session cookie with current datetime"""
        response = MagicMock(spec=Response)
        
        with patch('scrumix.api.utils.cookies.datetime') as mock_datetime:
            mock_now = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
            mock_datetime.now.return_value = mock_now
            
            clear_session_cookie(response, "test_key")
            
            response.set_cookie.assert_called_once()
            call_args = response.set_cookie.call_args[1]
            assert call_args["expires"] == mock_now

    def test_set_access_token_cookie_no_expiry(self):
        """Test setting access token cookie without expiry"""
        response = MagicMock(spec=Response)
        token = "access_token_no_expiry"
        
        with patch('scrumix.api.utils.cookies.set_session_cookie') as mock_set_session:
            set_access_token_cookie(response, token)
            
            mock_set_session.assert_called_once()
            args = mock_set_session.call_args[0]
            assert args[0] == response
            assert args[2] == token
            assert args[3] is None  # No expires_delta

    def test_set_refresh_token_cookie_no_expiry(self):
        """Test setting refresh token cookie without expiry"""
        response = MagicMock(spec=Response)
        token = "refresh_token_no_expiry"
        
        with patch('scrumix.api.utils.cookies.set_session_cookie') as mock_set_session:
            set_refresh_token_cookie(response, token)
            
            mock_set_session.assert_called_once()
            args = mock_set_session.call_args[0]
            assert args[0] == response
            assert args[2] == token
            assert args[3] is None  # No expires_delta 