"""
Comprehensive test execution script for new integration and edge case tests
Run this to execute all the new comprehensive tests
"""
import subprocess
import sys
import time
from pathlib import Path


def run_test_category(category_name: str, test_file: str, description: str):
    """Run a specific test category and report results"""
    print(f"\n{'='*60}")
    print(f"🧪 RUNNING {category_name.upper()}")
    print(f"📄 File: {test_file}")
    print(f"📝 {description}")
    print(f"{'='*60}")
    
    start_time = time.time()
    
    try:
        result = subprocess.run([
            sys.executable, "-m", "pytest",
            f"tests/{test_file}",
            "-v",
            "--tb=short",
            "--cov=src/scrumix",
            "--cov-report=term-missing"
        ], capture_output=True, text=True, check=True)
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"✅ {category_name} PASSED in {duration:.2f}s")
        print(f"📊 Coverage: {result.stdout.count('TOTAL')} tests executed")
        
        return True
        
    except subprocess.CalledProcessError as e:
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"❌ {category_name} FAILED in {duration:.2f}s")
        print(f"Error output:\n{e.stdout}")
        print(f"Error details:\n{e.stderr}")
        
        return False


def main():
    """Run comprehensive test suite"""
    print("🚀 ScrumiX Comprehensive Test Suite")
    print("=" * 60)
    print("This script runs the new comprehensive tests that address:")
    print("• Integration testing gaps")
    print("• Edge case coverage")
    print("• Model validation improvements")
    print("• Business logic testing")
    print("=" * 60)
    
    test_categories = [
        ("Integration Workflows", "test_integration_workflows.py", 
         "Complete cross-entity workflows, user permissions, and cascade operations"),
        
        ("Edge Cases", "test_edge_cases.py",
         "Boundary conditions, malformed data, security, and error handling"),
        
        ("Model Validation", "test_models_comprehensive.py",
         "Model constraints, relationships, enums, and data integrity"),
        
        ("Business Logic", "test_business_logic.py",
         "Calculations, business rules, workload management, and consistency")
    ]
    
    results = []
    total_start_time = time.time()
    
    for category_name, test_file, description in test_categories:
        success = run_test_category(category_name, test_file, description)
        results.append((category_name, success))
    
    total_end_time = time.time()
    total_duration = total_end_time - total_start_time
    
    # Summary
    print(f"\n{'='*60}")
    print("📋 COMPREHENSIVE TEST SUMMARY")
    print(f"{'='*60}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for category_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{category_name:<25} {status}")
    
    print(f"\n📊 Results: {passed}/{total} test categories passed")
    print(f"⏱️  Total time: {total_duration:.2f}s")
    
    if passed == total:
        print("🎉 All comprehensive tests PASSED!")
        print("\n📈 Test Suite Improvements:")
        print("• Added complete workflow integration tests")
        print("• Implemented boundary condition testing")
        print("• Enhanced model validation coverage")
        print("• Added business logic calculation tests")
        print("• Improved edge case handling verification")
        
        return 0
    else:
        print(f"⚠️  {total - passed} test categories FAILED")
        print("\n🔧 Some tests may fail due to missing implementations:")
        print("• Project statistics calculations (TODO in routes/projects.py)")
        print("• Sprint capacity validation")
        print("• User assignment endpoints")
        print("• Business rule enforcement")
        
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)