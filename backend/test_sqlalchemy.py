#!/usr/bin/env python3
"""Test SQLAlchemy connection"""

from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
import traceback

def test_sqlalchemy_connection():
    print("Testing SQLAlchemy connection...")
    
    # Use the exact same connection string as your backend
    connection_string = "postgresql://admin:postgres@localhost:5433/scrumix"
    print(f"Connection string: {connection_string}")
    
    try:
        engine = create_engine(connection_string, echo=True)
        print("✅ Engine created successfully!")
        
        # Test the connection
        with engine.connect() as conn:
            print("✅ Connection established successfully!")
            result = conn.execute("SELECT version()")
            version = result.fetchone()
            print(f"✅ PostgreSQL version: {version[0]}")
            
        return True
    except SQLAlchemyError as e:
        print(f"❌ SQLAlchemy error: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print("\nFull traceback:")
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print("\nFull traceback:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_sqlalchemy_connection()



