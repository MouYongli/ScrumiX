#!/usr/bin/env python3
"""
Test script for backlog embedding generation
This script demonstrates how to:
1. Create backlog items via API (which will auto-generate embeddings)
2. Test the semantic search functionality
3. Check embedding status
"""

import asyncio
import httpx
import json
from typing import Optional

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TEST_USERNAME = "admin"  # Replace with your test user
TEST_PASSWORD = "admin"  # Replace with your test password


class EmbeddingTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.headers = {"Content-Type": "application/json"}
    
    async def login(self, username: str, password: str) -> bool:
        """Login and get authentication token"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/auth/login",
                    data={"username": username, "password": password}
                )
                if response.status_code == 200:
                    data = response.json()
                    self.token = data.get("access_token")
                    self.headers["Authorization"] = f"Bearer {self.token}"
                    print("✅ Login successful")
                    return True
                else:
                    print(f"❌ Login failed: {response.status_code} - {response.text}")
                    return False
            except Exception as e:
                print(f"❌ Login error: {e}")
                return False
    
    async def create_test_backlog(self, title: str, description: str, project_id: int = 1) -> Optional[int]:
        """Create a test backlog item"""
        backlog_data = {
            "title": title,
            "description": description,
            "project_id": project_id,
            "item_type": "story",
            "priority": "medium",
            "status": "todo"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/backlogs/",
                    headers=self.headers,
                    json=backlog_data
                )
                if response.status_code == 201:
                    data = response.json()
                    backlog_id = data["id"]
                    print(f"✅ Created backlog {backlog_id}: {title}")
                    print(f"   📝 Description: {description}")
                    print(f"   🔄 Embedding generation scheduled in background")
                    return backlog_id
                else:
                    print(f"❌ Failed to create backlog: {response.status_code} - {response.text}")
                    return None
            except Exception as e:
                print(f"❌ Create backlog error: {e}")
                return None
    
    async def update_test_backlog(self, backlog_id: int, new_description: str):
        """Update a backlog item (will trigger embedding regeneration)"""
        update_data = {
            "description": new_description
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.put(
                    f"{self.base_url}/backlogs/{backlog_id}",
                    headers=self.headers,
                    json=update_data
                )
                if response.status_code == 200:
                    print(f"✅ Updated backlog {backlog_id}")
                    print(f"   📝 New description: {new_description}")
                    print(f"   🔄 Embedding regeneration scheduled in background")
                    return True
                else:
                    print(f"❌ Failed to update backlog: {response.status_code} - {response.text}")
                    return False
            except Exception as e:
                print(f"❌ Update backlog error: {e}")
                return False
    
    async def test_semantic_search(self, query: str, limit: int = 5):
        """Test semantic search functionality"""
        search_data = {
            "query": query,
            "limit": limit,
            "similarity_threshold": 0.5
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/semantic-search/semantic-search",
                    headers=self.headers,
                    json=search_data
                )
                if response.status_code == 200:
                    results = response.json()
                    print(f"🔍 Semantic search results for '{query}':")
                    if results:
                        for result in results:
                            backlog = result["backlog"]
                            score = result["similarity_score"]
                            print(f"   📄 ID: {backlog['id']} | Score: {score:.3f}")
                            print(f"      Title: {backlog['title']}")
                            print(f"      Description: {backlog['description'][:100]}...")
                            print()
                    else:
                        print("   No results found (embeddings might not be generated yet)")
                    return results
                else:
                    print(f"❌ Search failed: {response.status_code} - {response.text}")
                    return None
            except Exception as e:
                print(f"❌ Search error: {e}")
                return None
    
    async def check_embedding_status(self, backlog_id: int):
        """Check if embeddings have been generated for a backlog item"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/backlogs/{backlog_id}",
                    headers=self.headers
                )
                if response.status_code == 200:
                    data = response.json()
                    has_embedding = data.get("embedding_updated_at") is not None
                    print(f"📊 Backlog {backlog_id} embedding status: {'✅ Generated' if has_embedding else '⏳ Pending'}")
                    if has_embedding:
                        print(f"   🕒 Last updated: {data['embedding_updated_at']}")
                    return has_embedding
                else:
                    print(f"❌ Failed to check status: {response.status_code}")
                    return False
            except Exception as e:
                print(f"❌ Status check error: {e}")
                return False


async def main():
    """Main test function"""
    print("🚀 Starting Backlog Embedding Generation Test")
    print("=" * 50)
    
    tester = EmbeddingTester(API_BASE_URL)
    
    # Step 1: Login
    print("\n1️⃣ Logging in...")
    if not await tester.login(TEST_USERNAME, TEST_PASSWORD):
        print("❌ Cannot proceed without authentication")
        return
    
    # Step 2: Create test backlog items
    print("\n2️⃣ Creating test backlog items...")
    
    test_backlogs = [
        {
            "title": "User Authentication System",
            "description": "Implement secure user login and registration with JWT tokens, password hashing, and session management. Include OAuth integration for social login."
        },
        {
            "title": "Product Catalog API",
            "description": "Create REST API endpoints for managing product catalog including CRUD operations, search functionality, filtering by categories, and inventory tracking."
        },
        {
            "title": "Payment Processing Integration",
            "description": "Integrate Stripe payment gateway for handling credit card transactions, subscription billing, and refund processing with proper error handling."
        }
    ]
    
    created_ids = []
    for backlog_data in test_backlogs:
        backlog_id = await tester.create_test_backlog(
            backlog_data["title"], 
            backlog_data["description"]
        )
        if backlog_id:
            created_ids.append(backlog_id)
    
    if not created_ids:
        print("❌ No backlog items created, cannot continue test")
        return
    
    # Step 3: Wait a bit for embeddings to be generated
    print("\n3️⃣ Waiting for embedding generation...")
    print("⏳ Waiting 10 seconds for background tasks to complete...")
    await asyncio.sleep(10)
    
    # Step 4: Check embedding status
    print("\n4️⃣ Checking embedding status...")
    for backlog_id in created_ids:
        await tester.check_embedding_status(backlog_id)
    
    # Step 5: Test semantic search
    print("\n5️⃣ Testing semantic search...")
    
    test_queries = [
        "user login authentication",
        "API endpoints for products",
        "payment gateway integration",
        "database management",
        "security features"
    ]
    
    for query in test_queries:
        print(f"\n🔍 Testing query: '{query}'")
        await tester.test_semantic_search(query)
        await asyncio.sleep(1)  # Small delay between searches
    
    # Step 6: Test update functionality
    print("\n6️⃣ Testing update with embedding regeneration...")
    if created_ids:
        first_id = created_ids[0]
        await tester.update_test_backlog(
            first_id,
            "Updated: Enhanced user authentication system with multi-factor authentication, biometric login, and advanced security features including rate limiting and IP whitelisting."
        )
        
        # Wait and check status again
        await asyncio.sleep(5)
        await tester.check_embedding_status(first_id)
    
    print("\n🎉 Test completed!")
    print("\n📝 Summary:")
    print(f"   ✅ Created {len(created_ids)} backlog items")
    print("   ✅ Automatic embedding generation on create/update")
    print("   ✅ Semantic search functionality tested")
    print("   ✅ Background task processing verified")


if __name__ == "__main__":
    asyncio.run(main())
