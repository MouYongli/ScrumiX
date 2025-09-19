"""
OAuth related utility functions
"""
import httpx
import json
from typing import Optional, Dict, Any
from urllib.parse import urlencode

from scrumix.api.core.config import settings

class KeycloakOAuth:
    def __init__(self):
        self.client_id = settings.KEYCLOAK_CLIENT_ID
        self.client_secret = settings.KEYCLOAK_CLIENT_SECRET
        self.server_url = settings.KEYCLOAK_SERVER_URL
        self.realm = settings.KEYCLOAK_REALM
        
    @property
    def authorization_url(self) -> str:
        """Get authorization URL (public URL for browser redirects)"""
        return settings.KEYCLOAK_PUBLIC_AUTH_URL
    
    @property
    def token_url(self) -> str:
        """Get token URL"""
        return f"{self.server_url}/realms/{self.realm}/protocol/openid-connect/token"
    
    @property
    def userinfo_url(self) -> str:
        """Get user info URL"""
        return f"{self.server_url}/realms/{self.realm}/protocol/openid-connect/userinfo"
    
    def get_authorization_url(self, redirect_uri: str, state: Optional[str] = None, 
                            scope: str = "openid email profile") -> str:
        """Generate authorization URL"""
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "scope": scope,
        }
        
        if state:
            params["state"] = state
            
        return f"{self.authorization_url}?{urlencode(params)}"
    
    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Optional[Dict[str, Any]]:
        """Exchange authorization code for access token"""
        data = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "code": code,
            "redirect_uri": redirect_uri,
        }
        
        # Try Basic Authentication first (more secure)
        import base64
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": f"Basic {encoded_credentials}"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.token_url,
                    data=data,
                    headers=headers
                )
                response.raise_for_status()
                token_response = response.json()
                print(f"Token exchange successful: {token_response.keys()}")  # Debug token response keys
                return token_response
            except httpx.HTTPError as e:
                print(f"Error exchanging code for token with Basic auth: {e}")
                
                # Fallback to client_secret in body (less secure but sometimes required)
                data["client_secret"] = self.client_secret
                headers_fallback = {"Content-Type": "application/x-www-form-urlencoded"}
                
                try:
                    response = await client.post(
                        self.token_url,
                        data=data,
                        headers=headers_fallback
                    )
                    response.raise_for_status()
                    token_response = response.json()
                    print(f"Token exchange successful (fallback): {token_response.keys()}")  # Debug token response keys
                    return token_response
                except httpx.HTTPError as e2:
                    print(f"Error exchanging code for token with client_secret in body: {e2}")
                    return None
    
    async def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, Any]]:
        """Refresh access token"""
        data = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "refresh_token": refresh_token,
        }
        
        # Use Basic Authentication for client credentials
        import base64
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": f"Basic {encoded_credentials}"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.token_url,
                    data=data,
                    headers=headers
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Error refreshing token: {e}")
                return None
    
    async def get_user_info_from_token_response(self, token_response: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get user information from token response (try ID token first, then userinfo endpoint)"""
        # First try to decode the ID token which should contain user info
        id_token = token_response.get("id_token")
        if id_token:
            try:
                from jose import jwt
                # Decode without verification for development (in production, should verify signature)
                decoded_token = jwt.decode(id_token, key="", options={"verify_signature": False})
                print(f"ID token decoded successfully: {list(decoded_token.keys())}")
                print(f"ID token user info: sub={decoded_token.get('sub')}, email={decoded_token.get('email')}, name={decoded_token.get('name')}")
                return decoded_token
            except Exception as e:
                print(f"Failed to decode ID token: {e}")
                # Try alternative decoding method
                try:
                    import base64
                    import json
                    # Manual JWT decoding for debugging
                    parts = id_token.split('.')
                    if len(parts) == 3:
                        # Add padding if needed
                        payload = parts[1]
                        payload += '=' * (4 - len(payload) % 4)
                        decoded_bytes = base64.urlsafe_b64decode(payload)
                        decoded_token = json.loads(decoded_bytes.decode('utf-8'))
                        print(f"Manual ID token decode successful: {list(decoded_token.keys())}")
                        print(f"Manual ID token user info: sub={decoded_token.get('sub')}, email={decoded_token.get('email')}, name={decoded_token.get('name')}")
                        return decoded_token
                except Exception as e2:
                    print(f"Manual ID token decode also failed: {e2}")
        
        # Fallback to userinfo endpoint with better error handling
        access_token = token_response.get("access_token")
        if access_token:
            print(f"Trying userinfo endpoint as fallback...")
            print(f"Token scope: {token_response.get('scope', 'No scope info')}")
            print(f"Token type: {token_response.get('token_type', 'No token type')}")
            
            user_info = await self.get_user_info(access_token)
            if user_info:
                return user_info
            
            # If userinfo fails, try with different token format or headers
            print("Trying alternative userinfo request...")
            return await self.get_user_info_alternative(access_token)
        
        print("No valid token found in response")
        return None

    async def get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get user information from userinfo endpoint"""
        print(f"Getting user info with token: {access_token[:50]}..." if access_token else "No token")  # Debug token
        print(f"Userinfo URL: {self.userinfo_url}")  # Debug URL
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.userinfo_url,
                    headers=headers
                )
                print(f"Userinfo response status: {response.status_code}")  # Debug response status
                response.raise_for_status()
                user_info = response.json()
                print(f"User info received: {user_info.keys()}")  # Debug user info keys
                return user_info
            except httpx.HTTPError as e:
                print(f"Error getting user info: {e}")
                print(f"Response content: {e.response.content if hasattr(e, 'response') else 'No response'}")  # Debug error response
                return None
    
    async def get_user_info_alternative(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Alternative method to get user info - try with different approaches"""
        # Method 1: Try with client credentials in header
        import base64
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "X-Client-Authorization": f"Basic {encoded_credentials}"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                print(f"Trying userinfo with client credentials header...")
                response = await client.get(self.userinfo_url, headers=headers)
                if response.status_code == 200:
                    user_info = response.json()
                    print(f"Alternative userinfo successful: {user_info.keys()}")
                    return user_info
                print(f"Alternative method 1 failed: {response.status_code}")
            except Exception as e:
                print(f"Alternative method 1 error: {e}")
            
            # Method 2: Try with POST instead of GET
            try:
                print(f"Trying userinfo with POST method...")
                headers_post = {"Authorization": f"Bearer {access_token}"}
                response = await client.post(self.userinfo_url, headers=headers_post)
                if response.status_code == 200:
                    user_info = response.json()
                    print(f"POST userinfo successful: {user_info.keys()}")
                    return user_info
                print(f"Alternative method 2 failed: {response.status_code}")
            except Exception as e:
                print(f"Alternative method 2 error: {e}")
        
        return None

    async def validate_token(self, access_token: str) -> bool:
        """Verify if token is valid"""
        user_info = await self.get_user_info(access_token)
        return user_info is not None
    
    async def revoke_token(self, token: str, token_type: str = "access_token") -> bool:
        """Revoke token"""
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "token": token,
            "token_type_hint": token_type,
        }
        
        revoke_url = f"{self.server_url}/realms/{self.realm}/protocol/openid-connect/revoke"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    revoke_url,
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                return response.status_code == 200
            except httpx.HTTPError as e:
                print(f"Error revoking token: {e}")
                return False

# Instantiate OAuth client
keycloak_oauth = KeycloakOAuth() 