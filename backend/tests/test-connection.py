#!/usr/bin/env python3
"""
Simple PostgreSQL connection test script
Run this to verify your database connection works
"""
import os
import sys
import psycopg2
from psycopg2 import OperationalError

def test_connection(host, port, user, password, database):
    """Test PostgreSQL connection"""
    try:
        print(f"🔍 Testing connection to PostgreSQL...")
        print(f"   Host: {host}")
        print(f"   Port: {port}")
        print(f"   User: {user}")
        print(f"   Database: {database}")
        print()
        
        connection = psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            connect_timeout=10
        )
        
        cursor = connection.cursor()
        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()
        
        cursor.execute("SELECT current_database();")
        current_db = cursor.fetchone()
        
        print("✅ Connection successful!")
        print(f"📊 PostgreSQL version: {db_version[0]}")
        print(f"📂 Current database: {current_db[0]}")
        
        cursor.close()
        connection.close()
        return True
        
    except OperationalError as e:
        print(f"❌ Connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    print("🐘 PostgreSQL Connection Tester")
    print("=" * 40)
    
    # Default Docker values
    configs = [
        {
            "name": "Docker Internal (for containers)",
            "host": "db",  # Updated to match service name
            "port": "5432",
            "user": "postgres",
            "password": "scrumix",
            "database": "scrumix_dev"
        },
        {
            "name": "Docker External (from host)",
            "host": "localhost",
            "port": "5433",
            "user": "postgres",
            "password": "scrumix",
            "database": "scrumix_dev"
        }
    ]
    
    for config in configs:
        print(f"\n🧪 Testing {config['name']}:")
        print("-" * 40)
        test_connection(
            config["host"],
            config["port"],
            config["user"],
            config["password"],
            config["database"]
        )

if __name__ == "__main__":
    main()
