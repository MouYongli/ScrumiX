#!/usr/bin/env python3
"""Test PostgreSQL connection with Windows-specific parameters"""

import psycopg2
import traceback

def test_connection_windows():
    print("Testing PostgreSQL connection with Windows-specific parameters...")
    
    # Try different connection methods
    connection_params = [
        {
            "name": "Standard connection",
            "params": {
                "host": "localhost",
                "port": 5433,
                "user": "admin",
                "password": "postgres",
                "database": "scrumix"
            }
        },
        {
            "name": "Connection with explicit client_encoding",
            "params": {
                "host": "localhost",
                "port": 5433,
                "user": "admin",
                "password": "postgres",
                "database": "scrumix",
                "client_encoding": "utf8"
            }
        },
        {
            "name": "Connection with explicit application_name",
            "params": {
                "host": "localhost",
                "port": 5433,
                "user": "admin",
                "password": "postgres",
                "database": "scrumix",
                "application_name": "test_connection"
            }
        },
        {
            "name": "Connection with explicit connect_timeout",
            "params": {
                "host": "localhost",
                "port": 5433,
                "user": "admin",
                "password": "postgres",
                "database": "scrumix",
                "connect_timeout": 10
            }
        }
    ]
    
    for i, test in enumerate(connection_params, 1):
        print(f"\n--- Test {i}: {test['name']} ---")
        try:
            conn = psycopg2.connect(**test['params'])
            print("✅ Connection successful!")
            conn.close()
            return True
        except Exception as e:
            print(f"❌ Connection failed: {type(e).__name__}")
            print(f"Error message: {str(e)}")
            if hasattr(e, 'pgcode'):
                print(f"PostgreSQL error code: {e.pgcode}")
            if hasattr(e, 'pgerror'):
                print(f"PostgreSQL error: {e.pgerror}")
    
    return False

if __name__ == "__main__":
    test_connection_windows()



