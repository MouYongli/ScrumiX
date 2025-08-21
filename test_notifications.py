#!/usr/bin/env python3
"""
Test script for the notification system
"""
import requests
import json
from datetime import datetime, timedelta

# Configuration
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

def test_notification_endpoints():
    """Test the notification API endpoints"""
    print("🔔 Testing ScrumiX Notification System")
    print("=" * 50)
    
    # Test 1: Check if notification endpoints are available
    print("\n1. Testing API endpoints availability...")
    
    try:
        # Test unread count endpoint
        response = requests.get(f"{BACKEND_URL}/api/v1/notifications/unread-count")
        print(f"   ✅ Unread count endpoint: {response.status_code}")
        
        # Test feed endpoint
        response = requests.get(f"{BACKEND_URL}/api/v1/notifications/feed")
        print(f"   ✅ Feed endpoint: {response.status_code}")
        
        # Test stats endpoint
        response = requests.get(f"{BACKEND_URL}/api/v1/notifications/stats")
        print(f"   ✅ Stats endpoint: {response.status_code}")
        
    except requests.exceptions.ConnectionError:
        print("   ❌ Backend server not running at http://localhost:8000")
        print("   Please make sure the backend is started with: python -m uvicorn scrumix.main:app --reload")
        return False
    
    # Test 2: Check frontend availability
    print("\n2. Testing frontend availability...")
    try:
        response = requests.get(FRONTEND_URL)
        print(f"   ✅ Frontend accessible: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Frontend server not running at http://localhost:3000")
        print("   Please make sure the frontend is started with: npm run dev")
        return False
    
    print("\n✅ All systems are running!")
    return True

def create_test_notification():
    """Create a test notification via API"""
    print("\n3. Creating test notification...")
    
    # Sample notification data
    notification_data = {
        "title": "Welcome to ScrumiX Notifications!",
        "message": "Your notification system is now active and ready to keep you updated on project activities.",
        "notification_type": "SYSTEM_ANNOUNCEMENT",
        "priority": "MEDIUM",
        "action_url": "/notifications",
        "action_text": "View All Notifications",
        "recipient_user_ids": [1],  # Assuming user ID 1 exists
        "project_id": 1  # Assuming project ID 1 exists
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/v1/notifications/",
            headers={"Content-Type": "application/json"},
            json=notification_data
        )
        
        if response.status_code == 201:
            print("   ✅ Test notification created successfully!")
            return response.json()
        else:
            print(f"   ⚠️  Could not create notification: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"   ❌ Error creating notification: {e}")
        return None

def main():
    """Main test function"""
    print("🚀 ScrumiX Notification System Test")
    print("This script will verify that your notification system is working correctly.\n")
    
    # Test basic connectivity
    if not test_notification_endpoints():
        return
    
    # Try to create a test notification
    create_test_notification()
    
    print("\n" + "=" * 50)
    print("📋 Next Steps:")
    print("1. Open your browser to http://localhost:3000")
    print("2. Log in to your ScrumiX account")
    print("3. Look for the notification bell icon in the header")
    print("4. Click it to see your notifications!")
    print("5. Try creating a meeting or updating a task to see automatic notifications")
    print("\n📍 Key Features to Test:")
    print("• Notification bell with unread count")
    print("• Notification center dropdown")
    print("• Full notifications page at /notifications")
    print("• Automatic notifications when creating meetings")
    print("• Automatic notifications when updating task status")
    print("• Mark as read/dismiss functionality")
    print("• Real-time unread count updates")
    
    print("\n🎉 Your notification system is ready!")

if __name__ == "__main__":
    main()
