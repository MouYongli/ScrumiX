#!/usr/bin/env python3
"""Test PostgreSQL connection"""

import psycopg2
import traceback

def test_connection():
    print("Testing PostgreSQL connection...")
    print("Host: localhost")
    print("Port: 5433")
    print("User: admin")
    print("Database: scrumix")
    
    try:
        conn = psycopg2.connect(
            host='localhost',
            port=5433,
            user='admin',
            password='postgres',
            database='scrumix'
        )
        print("✅ Connection successful!")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Connection failed: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print("\nFull traceback:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_connection()



