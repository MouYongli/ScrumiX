#!/usr/bin/env python3
"""
Test runner script for ScrumiX backend
"""
import sys
import subprocess
import os
from pathlib import Path


def run_tests():
    """Run all tests with coverage reporting"""
    print("🧪 Running ScrumiX Backend Tests")
    print("=" * 50)
    
    # Install test dependencies if not already installed
    try:
        import pytest
        import coverage
    except ImportError:
        print("Installing test dependencies...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-e", ".[dev]"], check=True)
    
    # Run tests with coverage
    print("Starting test execution...")
    
    cmd = [
        sys.executable, "-m", "pytest",
        "--cov=src/scrumix",
        "--cov-report=term-missing",
        "--cov-report=html:htmlcov",
        "--cov-report=xml",
        "--cov-fail-under=80",
        "-v",
        "tests/"
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\nAll tests passed!")
        print("Coverage report generated in htmlcov/")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\nTests failed with exit code {e.returncode}")
        return False


def run_specific_tests(test_pattern=None):
    """Run specific tests"""
    print("🧪 Running Specific Tests")
    print("=" * 50)
    
    cmd = [
        sys.executable, "-m", "pytest",
        "--cov=src/scrumix",
        "--cov-report=term-missing",
        "-v"
    ]
    
    if test_pattern:
        cmd.append(f"tests/test_{test_pattern}.py")
    else:
        cmd.append("tests/")
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\nTests passed!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\nTests failed with exit code {e.returncode}")
        return False


def run_unit_tests():
    """Run only unit tests"""
    print("Running Unit Tests")
    print("=" * 50)
    
    cmd = [
        sys.executable, "-m", "pytest",
        "--cov=src/scrumix",
        "--cov-report=term-missing",
        "-v",
        "-m", "unit",
        "tests/"
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\nUnit tests passed!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\nUnit tests failed with exit code {e.returncode}")
        return False


def run_integration_tests():
    """Run only integration tests"""
    print("Running Integration Tests")
    print("=" * 50)
    
    cmd = [
        sys.executable, "-m", "pytest",
        "--cov=src/scrumix",
        "--cov-report=term-missing",
        "-v",
        "-m", "integration",
        "tests/"
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\nIntegration tests passed!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\nIntegration tests failed with exit code {e.returncode}")
        return False


def show_coverage():
    """Show coverage report"""
    print("Coverage Report")
    print("=" * 50)
    
    cmd = [
        sys.executable, "-m", "coverage", "report"
    ]
    
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Coverage report failed: {e}")


def main():
    """Main function"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "unit":
            success = run_unit_tests()
        elif command == "integration":
            success = run_integration_tests()
        elif command == "coverage":
            show_coverage()
            return
        elif command == "specific":
            test_pattern = sys.argv[2] if len(sys.argv) > 2 else None
            success = run_specific_tests(test_pattern)
        else:
            print("Usage: python run_tests.py [unit|integration|coverage|specific]")
            print("  unit: Run only unit tests")
            print("  integration: Run only integration tests")
            print("  coverage: Show coverage report")
            print("  specific [pattern]: Run specific tests")
            return
    else:
        success = run_tests()
    
    if success:
        print("\nTest execution completed successfully!")
        sys.exit(0)
    else:
        print("\nTest execution failed!")
        sys.exit(1)


if __name__ == "__main__":
    main() 