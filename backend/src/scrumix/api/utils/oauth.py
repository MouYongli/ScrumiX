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
        """Get authorization URL"""
        return f"{self.server_url}/realms/{self.realm}/protocol/openid-connect/auth"
    
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
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.token_url,
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Error exchanging code for token: {e}")
                return None
    
    async def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, Any]]:
        """Refresh access token"""
        data = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.token_url,
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Error refreshing token: {e}")
                return None
    
    async def get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get user information"""
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.userinfo_url,
                    headers=headers
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Error getting user info: {e}")
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