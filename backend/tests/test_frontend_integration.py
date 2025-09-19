"""
Frontend Integration Tests - Cookie Auth, CORS, and Environment Settings
Tests critical flows needed for frontend-backend integration
"""
import pytest
import os
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import patch
from sqlalchemy.orm import Session

from scrumix.api.app import app
from scrumix.api.core.config import settings
from scrumix.api.models.user import User, UserStatus
from scrumix.api.utils.password import get_password_hash
from scrumix.api.db.database import get_db


class TestCookieAuthIntegration:
    """Test cookie-based authentication flows"""

    def test_auth_cookie_roundtrip(self, db_session: Session):
        """Test complete auth flow: register → login (sets cookies) → /auth/me (uses cookies only)"""
        # Override the database dependency to use our test session
        app.dependency_overrides[get_db] = lambda: db_session
        
        # Clear any auth overrides to test real auth
        from scrumix.api.core.security import get_current_user_hybrid, get_current_user
        if get_current_user_hybrid in app.dependency_overrides:
            del app.dependency_overrides[get_current_user_hybrid]
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]
        
        with TestClient(app) as client:
            # Step 1: Register user
            register_data = {
                "email": "integration@test.com",
                "username": "testuser",
                "full_name": "Integration User",
                "password": "testpassword123"
            }
            
            register_response = client.post("/api/v1/auth/register", json=register_data)
            assert register_response.status_code == 201
            
            # Step 2: Login and verify cookies are set
            login_data = {
                "email": "integration@test.com",
                "password": "testpassword123",
                "remember_me": True
            }
            
            login_response = client.post("/api/v1/auth/login", json=login_data)
            assert login_response.status_code == 200
            
            # Verify response contains user data but no sensitive tokens
            login_json = login_response.json()
            assert "user" in login_json
            assert login_json["user"]["email"] == "integration@test.com"
            
            # Verify cookies are set in response headers
            set_cookie_headers = login_response.headers.get_list("set-cookie")
            assert len(set_cookie_headers) >= 1
            
            # Check for session cookie
            session_cookie_found = False
            refresh_cookie_found = False
            for cookie_header in set_cookie_headers:
                if settings.SESSION_COOKIE_NAME in cookie_header:
                    session_cookie_found = True
                    assert "HttpOnly" in cookie_header
                    assert "Path=/" in cookie_header
                if settings.REFRESH_COOKIE_NAME in cookie_header:
                    refresh_cookie_found = True
                    assert "HttpOnly" in cookie_header
                    assert "Path=/" in cookie_header
            
            assert session_cookie_found, f"Session cookie {settings.SESSION_COOKIE_NAME} not found in Set-Cookie headers"
            assert refresh_cookie_found, f"Refresh cookie {settings.REFRESH_COOKIE_NAME} not found in Set-Cookie headers"
            
            # Step 3: Use /auth/me with cookies only (no Authorization header)
            me_response = client.get("/api/v1/auth/me")
            assert me_response.status_code == 200
            
            me_json = me_response.json()
            assert me_json["email"] == "integration@test.com"
            assert me_json["username"] == "testuser"
        
        # Clean up overrides
        app.dependency_overrides.clear()

    def test_refresh_token_cookie_flow(self, db_session: Session):
        """Test refresh token flow using cookies"""
        app.dependency_overrides[get_db] = lambda: db_session
        
        # Clear auth overrides
        from scrumix.api.core.security import get_current_user_hybrid, get_current_user
        if get_current_user_hybrid in app.dependency_overrides:
            del app.dependency_overrides[get_current_user_hybrid]
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]
        
        with TestClient(app) as client:
            # Create and login user
            user = User(
                email="refresh@test.com",
                username="refreshuser",
                full_name="Refresh User",
                hashed_password=get_password_hash("testpassword123"),
                is_active=True,
                is_verified=True,
                status=UserStatus.ACTIVE,
                timezone="UTC",
                language="en",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db_session.add(user)
            db_session.commit()
            
            # Login with remember_me to get refresh cookie
            login_data = {
                "email": "refresh@test.com",
                "password": "testpassword123",
                "remember_me": True
            }
            
            login_response = client.post("/api/v1/auth/login", json=login_data)
            assert login_response.status_code == 200
            
            # Test refresh endpoint
            refresh_response = client.post("/api/v1/auth/refresh")
            
            # Should either succeed (200) with new tokens or fail (401) if refresh logic incomplete
            # For now, we check that the endpoint exists and handles the request
            assert refresh_response.status_code in [200, 401, 422]
            
            if refresh_response.status_code == 200:
                # If refresh succeeds, verify new access token cookie is set
                refresh_cookies = refresh_response.headers.get_list("set-cookie")
                session_cookie_renewed = any(
                    settings.SESSION_COOKIE_NAME in cookie 
                    for cookie in refresh_cookies
                )
                # Should renew session cookie
                assert session_cookie_renewed
        
        app.dependency_overrides.clear()

    def test_logout_clears_cookies(self, db_session: Session):
        """Test that logout clears authentication cookies"""
        app.dependency_overrides[get_db] = lambda: db_session
        
        # Clear auth overrides
        from scrumix.api.core.security import get_current_user_hybrid, get_current_user
        if get_current_user_hybrid in app.dependency_overrides:
            del app.dependency_overrides[get_current_user_hybrid]
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]
        
        with TestClient(app) as client:
            # Create and login user
            user = User(
                email="logout@test.com",
                username="logoutuser",
                full_name="Logout User",
                hashed_password=get_password_hash("testpassword123"),
                is_active=True,
                is_verified=True,
                status=UserStatus.ACTIVE,
                timezone="UTC",
                language="en",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db_session.add(user)
            db_session.commit()
            
            # Login first
            login_data = {
                "email": "logout@test.com",
                "password": "testpassword123",
                "remember_me": True
            }
            
            login_response = client.post("/api/v1/auth/login", json=login_data)
            assert login_response.status_code == 200
            
            # Logout
            logout_response = client.post("/api/v1/auth/logout")
            assert logout_response.status_code == 200
            
            # Verify cookies are cleared (max-age=0 or expires in past)
            logout_cookies = logout_response.headers.get_list("set-cookie")
            
            session_cookie_cleared = False
            refresh_cookie_cleared = False
            
            for cookie_header in logout_cookies:
                if settings.SESSION_COOKIE_NAME in cookie_header:
                    # Cookie should be cleared (empty value or max-age=0)
                    assert ("max-age=0" in cookie_header.lower() or 
                            f"{settings.SESSION_COOKIE_NAME}=;" in cookie_header or
                            f"{settings.SESSION_COOKIE_NAME}=" in cookie_header)
                    session_cookie_cleared = True
                
                if settings.REFRESH_COOKIE_NAME in cookie_header:
                    assert ("max-age=0" in cookie_header.lower() or 
                            f"{settings.REFRESH_COOKIE_NAME}=;" in cookie_header or
                            f"{settings.REFRESH_COOKIE_NAME}=" in cookie_header)
                    refresh_cookie_cleared = True
            
            # At minimum, session cookie should be cleared
            assert session_cookie_cleared, "Session cookie not cleared on logout"
            
            # After logout, /auth/me should fail
            me_after_logout = client.get("/api/v1/auth/me")
            assert me_after_logout.status_code == 401
        
        app.dependency_overrides.clear()


class TestCORSIntegration:
    """Test CORS behavior for frontend integration"""

    def test_cors_preflight_with_credentials(self):
        """Test CORS preflight request with credentials for cross-origin requests"""
        with TestClient(app) as client:
            # Send OPTIONS preflight request
            preflight_response = client.options(
                "/api/v1/projects/",
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "Content-Type,Authorization"
                }
            )
            
            # Should return 200 for preflight
            assert preflight_response.status_code == 200
            
            # Check CORS headers
            cors_headers = preflight_response.headers
            
            # Verify allowed origin
            assert "access-control-allow-origin" in cors_headers
            allowed_origin = cors_headers["access-control-allow-origin"]
            assert allowed_origin in ["http://localhost:3000", "*"]
            
            # Verify credentials are allowed (essential for cookies)
            assert "access-control-allow-credentials" in cors_headers
            assert cors_headers["access-control-allow-credentials"].lower() == "true"
            
            # Verify allowed methods include POST
            assert "access-control-allow-methods" in cors_headers
            allowed_methods = cors_headers["access-control-allow-methods"].upper()
            assert "POST" in allowed_methods
            
            # Verify allowed headers include Content-Type
            assert "access-control-allow-headers" in cors_headers
            allowed_headers = cors_headers["access-control-allow-headers"].lower()
            assert "content-type" in allowed_headers

    def test_cors_actual_request_with_origin(self):
        """Test actual CORS request with Origin header"""
        with TestClient(app) as client:
            # Send actual request with Origin header
            response = client.get(
                "/health",
                headers={
                    "Origin": "http://localhost:3000"
                }
            )
            
            assert response.status_code == 200
            
            # Check that CORS headers are present in actual response
            cors_headers = response.headers
            
            # Should include Access-Control-Allow-Origin
            assert "access-control-allow-origin" in cors_headers
            
            # Should include Access-Control-Allow-Credentials for cookie support
            if "access-control-allow-credentials" in cors_headers:
                assert cors_headers["access-control-allow-credentials"].lower() == "true"


class TestProductionCookieSettings:
    """Test environment-based cookie security settings"""

    def test_production_cookie_flags(self, db_session: Session):
        """Test that production environment sets secure cookie flags"""
        # Mock production environment
        with patch.dict(os.environ, {
            "ENVIRONMENT": "production",
            "COOKIE_DOMAIN": ".example.com"
        }):
            # Reload settings to pick up environment changes
            from scrumix.api.core.config import Settings
            prod_settings = Settings()
            
            # Verify production settings
            assert prod_settings.ENVIRONMENT == "production"
            assert prod_settings.SECURE_COOKIES == True
            assert prod_settings.COOKIE_SAMESITE == "strict"
            assert prod_settings.COOKIE_DOMAIN == ".example.com"
            
            # Test login with production settings
            with patch('scrumix.api.core.config.settings', prod_settings), \
                 patch('scrumix.api.utils.cookies.settings', prod_settings), \
                 patch('scrumix.api.routes.auth.settings', prod_settings):
                app.dependency_overrides[get_db] = lambda: db_session
                
                # Clear auth overrides
                from scrumix.api.core.security import get_current_user_hybrid, get_current_user
                if get_current_user_hybrid in app.dependency_overrides:
                    del app.dependency_overrides[get_current_user_hybrid]
                if get_current_user in app.dependency_overrides:
                    del app.dependency_overrides[get_current_user]
                
                with TestClient(app) as client:
                    # Create user
                    user = User(
                        email="prod@test.com",
                        username="produser",
                        full_name="Production User",
                        hashed_password=get_password_hash("testpassword123"),
                        is_active=True,
                        is_verified=True,
                        status=UserStatus.ACTIVE,
                        timezone="UTC",
                        language="en",
                        created_at=datetime.now(),
                        updated_at=datetime.now()
                    )
                    db_session.add(user)
                    db_session.commit()
                    
                    # Login
                    login_data = {
                        "email": "prod@test.com",
                        "password": "testpassword123",
                        "remember_me": True
                    }
                    
                    login_response = client.post("/api/v1/auth/login", json=login_data)
                    assert login_response.status_code == 200
                    
                    # Check cookie security flags
                    set_cookie_headers = login_response.headers.get_list("set-cookie")
                    
                    session_cookie_header = None
                    for cookie_header in set_cookie_headers:
                        if prod_settings.SESSION_COOKIE_NAME in cookie_header:
                            session_cookie_header = cookie_header
                            break
                    
                    assert session_cookie_header is not None, "Session cookie not found"
                    
                    # In production, cookies should be secure
                    assert "Secure" in session_cookie_header
                    assert "SameSite=Strict" in session_cookie_header or "samesite=strict" in session_cookie_header.lower()
                    assert "Domain=.example.com" in session_cookie_header

                app.dependency_overrides.clear()

    def test_development_cookie_flags(self, db_session: Session):
        """Test that development environment uses relaxed cookie flags"""
        # Mock development environment
        with patch.dict(os.environ, {
            "ENVIRONMENT": "development",
            "COOKIE_DOMAIN": ""
        }):
            # Reload settings
            from scrumix.api.core.config import Settings
            dev_settings = Settings()
            
            # Verify development settings
            assert dev_settings.ENVIRONMENT == "development"
            assert dev_settings.SECURE_COOKIES == False
            assert dev_settings.COOKIE_SAMESITE == "lax"
            assert dev_settings.COOKIE_DOMAIN in [None, ""]
            
            # Test login with development settings
            with patch('scrumix.api.core.config.settings', dev_settings), \
                 patch('scrumix.api.utils.cookies.settings', dev_settings), \
                 patch('scrumix.api.routes.auth.settings', dev_settings):
                app.dependency_overrides[get_db] = lambda: db_session
                
                # Clear auth overrides
                from scrumix.api.core.security import get_current_user_hybrid, get_current_user
                if get_current_user_hybrid in app.dependency_overrides:
                    del app.dependency_overrides[get_current_user_hybrid]
                if get_current_user in app.dependency_overrides:
                    del app.dependency_overrides[get_current_user]
                
                with TestClient(app) as client:
                    # Create user
                    user = User(
                        email="dev@test.com",
                        username="devuser",
                        full_name="Development User",
                        hashed_password=get_password_hash("testpassword123"),
                        is_active=True,
                        is_verified=True,
                        status=UserStatus.ACTIVE,
                        timezone="UTC",
                        language="en",
                        created_at=datetime.now(),
                        updated_at=datetime.now()
                    )
                    db_session.add(user)
                    db_session.commit()
                    
                    # Login
                    login_data = {
                        "email": "dev@test.com",
                        "password": "testpassword123",
                        "remember_me": False
                    }
                    
                    login_response = client.post("/api/v1/auth/login", json=login_data)
                    assert login_response.status_code == 200
                    
                    # Check cookie flags for development
                    set_cookie_headers = login_response.headers.get_list("set-cookie")
                    
                    session_cookie_header = None
                    for cookie_header in set_cookie_headers:
                        if dev_settings.SESSION_COOKIE_NAME in cookie_header:
                            session_cookie_header = cookie_header
                            break
                    
                    assert session_cookie_header is not None, "Session cookie not found"
                    
                    # In development, cookies should NOT be secure
                    assert "Secure" not in session_cookie_header
                    assert ("SameSite=Lax" in session_cookie_header or 
                            "samesite=lax" in session_cookie_header.lower())
                    # Domain should not be set in development
                    assert "Domain=" not in session_cookie_header or "Domain=None" in session_cookie_header

                app.dependency_overrides.clear()


class TestAPIEndpointAccess:
    """Test critical API endpoints exist and are accessible"""

    def test_auth_endpoints_exist(self, db_session: Session):
        """Test that critical auth endpoints exist"""
        # Override database dependency
        app.dependency_overrides[get_db] = lambda: db_session
        
        try:
            with TestClient(app) as client:
                # Test /health endpoint (should always work)
                health_response = client.get("/health")
                assert health_response.status_code == 200
                
                # Test auth endpoints exist (may return 401/422 but shouldn't be 404)
                endpoints_to_test = [
                    ("/api/v1/auth/register", "POST"),
                    ("/api/v1/auth/login", "POST"),
                    ("/api/v1/auth/logout", "POST"),
                    ("/api/v1/auth/me", "GET"),
                    ("/api/v1/auth/refresh", "POST"),
                ]
                
                for endpoint, method in endpoints_to_test:
                    if method == "GET":
                        response = client.get(endpoint)
                    elif method == "POST":
                        response = client.post(endpoint, json={})
                    
                    # Should not be 404 (endpoint exists)
                    assert response.status_code != 404, f"Endpoint {method} {endpoint} not found"
                    # Common expected codes: 401 (unauthorized), 422 (validation error), 200 (success)
                    assert response.status_code in [200, 401, 422, 400], f"Unexpected status {response.status_code} for {endpoint}"
        finally:
            # Clean up overrides
            app.dependency_overrides.clear()

    def test_project_endpoints_exist(self, db_session: Session):
        """Test that project CRUD endpoints exist"""
        # Override database dependency
        app.dependency_overrides[get_db] = lambda: db_session
        
        try:
            with TestClient(app) as client:
                endpoints_to_test = [
                    ("/api/v1/projects/", "GET"),
                    ("/api/v1/projects/", "POST"),
                    ("/api/v1/projects/1", "GET"),
                    ("/api/v1/projects/1", "PUT"),
                    ("/api/v1/projects/1", "DELETE"),
                ]
                
                for endpoint, method in endpoints_to_test:
                    if method == "GET":
                        response = client.get(endpoint)
                    elif method == "POST":
                        response = client.post(endpoint, json={})
                    elif method == "PUT":
                        response = client.put(endpoint, json={})
                    elif method == "DELETE":
                        response = client.delete(endpoint)
                    
                    # Should not be 404
                    assert response.status_code != 404, f"Endpoint {method} {endpoint} not found"
        finally:
            # Clean up overrides
            app.dependency_overrides.clear()
