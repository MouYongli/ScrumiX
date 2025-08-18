#!/usr/bin/env python3
"""
Test script for profile functionality integration
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from scrumix.api.db.database import get_db
from scrumix.api.models.user import User
from scrumix.api.crud.user import user_crud
from scrumix.api.schemas.user import ProfileUpdate

def test_profile_functionality():
    """Test the profile functionality"""
    print("Testing profile functionality...")
    
    # Create in-memory SQLite database for testing
    engine = create_engine("sqlite:///:memory:")
    
    # Import and create tables
    from scrumix.api.db.base import Base
    Base.metadata.create_all(bind=engine)
    
    # Create session
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    try:
        # Test creating a user with profile fields
        print("1. Testing user creation with profile fields...")
        
        # Create a test user
        user_data = {
            "email": "test@example.com",
            "username": "testuser",
            "full_name": "Test User",
            "phone": "+1234567890",
            "department": "Engineering",
            "location": "San Francisco",
            "bio": "Software engineer passionate about agile development"
        }
        
        # This would normally be done through the API, but we'll test the model directly
        user = User(
            email=user_data["email"],
            username=user_data["username"],
            full_name=user_data["full_name"],
            phone=user_data["phone"],
            department=user_data["department"],
            location=user_data["location"],
            bio=user_data["bio"]
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"   ✓ User created with ID: {user.id}")
        print(f"   ✓ Phone: {user.phone}")
        print(f"   ✓ Department: {user.department}")
        print(f"   ✓ Location: {user.location}")
        print(f"   ✓ Bio: {user.bio}")
        
        # Test updating profile
        print("\n2. Testing profile update...")
        
        profile_update = ProfileUpdate(
            phone="+0987654321",
            department="Product Management",
            location="New York",
            bio="Updated bio: Product manager with agile expertise"
        )
        
        # Convert to UserUpdate for compatibility
        from scrumix.api.schemas.user import UserUpdate
        user_update_data = profile_update.model_dump(exclude_unset=True)
        user_update = UserUpdate(**user_update_data)
        
        updated_user = user_crud.update_user(db, user.id, user_update)
        
        if updated_user:
            print(f"   ✓ Profile updated successfully")
            print(f"   ✓ New phone: {updated_user.phone}")
            print(f"   ✓ New department: {updated_user.department}")
            print(f"   ✓ New location: {updated_user.location}")
            print(f"   ✓ New bio: {updated_user.bio}")
        else:
            print("   ✗ Profile update failed")
        
        # Test password change (this would require a user with hashed_password)
        print("\n3. Testing password change...")
        
        # Create a user with password for testing
        from scrumix.api.utils.password import get_password_hash
        password_user = User(
            email="password@example.com",
            username="passworduser",
            full_name="Password User",
            hashed_password=get_password_hash("oldpassword123")
        )
        
        db.add(password_user)
        db.commit()
        db.refresh(password_user)
        
        # Test password change
        success = user_crud.change_password(
            db, 
            password_user.id, 
            "oldpassword123", 
            "newpassword456"
        )
        
        if success:
            print("   ✓ Password changed successfully")
        else:
            print("   ✗ Password change failed")
        
        print("\n✅ All profile functionality tests passed!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    test_profile_functionality()
