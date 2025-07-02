#!/usr/bin/env python3
"""
Simple test script to verify cookie-based authentication functionality

This script demonstrates:
1. Login with credentials
2. Cookies being set automatically
3. Authenticated requests using cookies
4. Token refresh using cookies
5. Logout clearing cookies

Run this script after starting your FastAPI server to test the implementation.
"""

import requests
import json
from typing import Optional


class CookieAuthTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json'
        })
    
    def test_login(self, email: str, password: str, remember_me: bool = True) -> bool:
        """Test login functionality with cookie setting"""
        print(f"🔐 Testing login for {email}...")
        
        login_data = {
            "email": email,
            "password": password,
            "remember_me": remember_me
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/v1/auth/login",
                json=login_data
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Login successful!")
                print(f"   User: {result['user']['email']}")
                print(f"   Cookies set: {list(self.session.cookies.keys())}")
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def test_authenticated_request(self) -> bool:
        """Test making authenticated requests using cookies"""
        print(f"🔍 Testing authenticated request...")
        
        try:
            response = self.session.get(f"{self.base_url}/api/v1/auth/me")
            
            if response.status_code == 200:
                user = response.json()
                print(f"✅ Authenticated request successful!")
                print(f"   Current user: {user['email']}")
                return True
            else:
                print(f"❌ Authenticated request failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Request error: {str(e)}")
            return False
    
    def test_verification_endpoint(self) -> bool:
        """Test the verification endpoint to see cookie details"""
        print(f"🔍 Testing verification endpoint...")
        
        try:
            response = self.session.get(f"{self.base_url}/api/v1/auth/verify")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Verification successful!")
                print(f"   Session cookie present: {data['has_session_cookie']}")
                print(f"   Refresh cookie present: {data['has_refresh_cookie']}")
                print(f"   Environment: {data['cookie_settings']['environment']}")
                print(f"   Secure cookies: {data['cookie_settings']['secure']}")
                print(f"   SameSite: {data['cookie_settings']['samesite']}")
                return True
            else:
                print(f"❌ Verification failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Verification error: {str(e)}")
            return False
    
    def test_token_refresh(self) -> bool:
        """Test token refresh using refresh cookie"""
        print(f"🔄 Testing token refresh...")
        
        try:
            response = self.session.post(f"{self.base_url}/api/v1/auth/refresh")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Token refresh successful!")
                print(f"   New token received")
                return True
            else:
                print(f"❌ Token refresh failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Refresh error: {str(e)}")
            return False
    
    def test_logout(self) -> bool:
        """Test logout functionality with cookie clearing"""
        print(f"🚪 Testing logout...")
        
        try:
            response = self.session.post(f"{self.base_url}/api/v1/auth/logout")
            
            if response.status_code == 200:
                print(f"✅ Logout successful!")
                print(f"   Cookies after logout: {list(self.session.cookies.keys())}")
                return True
            else:
                print(f"❌ Logout failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Logout error: {str(e)}")
            return False
    
    def test_post_logout_request(self) -> bool:
        """Test that requests fail after logout"""
        print(f"🔒 Testing post-logout authentication...")
        
        try:
            response = self.session.get(f"{self.base_url}/api/v1/auth/me")
            
            if response.status_code == 401:
                print(f"✅ Post-logout request correctly unauthorized!")
                return True
            else:
                print(f"❌ Post-logout request should have failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Post-logout test error: {str(e)}")
            return False
    
    def run_full_test(self, email: str = "test@example.com", password: str = "testpassword"):
        """Run the complete test suite"""
        print("🧪 Starting Cookie Authentication Test Suite")
        print("=" * 50)
        
        # Test 1: Login
        if not self.test_login(email, password):
            print("❌ Test suite failed at login step")
            return False
        
        print()
        
        # Test 2: Authenticated request
        if not self.test_authenticated_request():
            print("❌ Test suite failed at authenticated request step")
            return False
        
        print()
        
        # Test 3: Verification endpoint
        if not self.test_verification_endpoint():
            print("❌ Test suite failed at verification step")
            return False
        
        print()
        
        # Test 4: Token refresh
        if not self.test_token_refresh():
            print("❌ Test suite failed at token refresh step")
            return False
        
        print()
        
        # Test 5: Logout
        if not self.test_logout():
            print("❌ Test suite failed at logout step")
            return False
        
        print()
        
        # Test 6: Post-logout request
        if not self.test_post_logout_request():
            print("❌ Test suite failed at post-logout verification step")
            return False
        
        print()
        print("🎉 All tests passed! Cookie authentication is working correctly.")
        return True


if __name__ == "__main__":
    print("Cookie Authentication Test Script")
    print("Make sure your FastAPI server is running on http://localhost:8000")
    print()
    
    # You may need to create a test user first
    email = input("Enter test email (or press Enter for test@example.com): ").strip()
    if not email:
        email = "test@example.com"
    
    password = input("Enter test password (or press Enter for testpassword): ").strip()
    if not password:
        password = "testpassword"
    
    print()
    
    tester = CookieAuthTester()
    success = tester.run_full_test(email, password)
    
    if not success:
        print("\n❌ Some tests failed. Please check your implementation.")
        exit(1)
    else:
        print("\n✅ All tests passed!")
        exit(0) 