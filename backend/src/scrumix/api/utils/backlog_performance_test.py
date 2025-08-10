"""
Backlog Performance Testing and Monitoring
"""
import time
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from datetime import datetime, timedelta

from ..models.backlog import Backlog, BacklogStatus, BacklogPriority, BacklogType
from ..crud.backlog import backlog_crud

class BacklogPerformanceMonitor:
    """Monitor and test backlog query performance"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def measure_query_time(self, query_func, *args, **kwargs) -> Dict[str, Any]:
        """Measure execution time of a query function"""
        start_time = time.time()
        result = query_func(*args, **kwargs)
        end_time = time.time()
        
        return {
            "execution_time": end_time - start_time,
            "result_count": len(result) if isinstance(result, list) else 1,
            "result": result
        }
    
    def test_basic_queries(self) -> Dict[str, Any]:
        """Test basic backlog queries"""
        results = {}
        
        # Test getting all backlogs
        results["get_all_backlogs"] = self.measure_query_time(
            backlog_crud.get_backlogs, self.db, skip=0, limit=100
        )
        
        # Test getting backlogs by status
        results["get_by_status"] = self.measure_query_time(
            backlog_crud.get_backlogs_by_status, self.db, BacklogStatus.TODO
        )
        
        # Test getting backlogs by priority
        results["get_by_priority"] = self.measure_query_time(
            backlog_crud.get_backlogs_by_priority, self.db, BacklogPriority.HIGH
        )
        
        # Test getting root backlogs
        results["get_root_backlogs"] = self.measure_query_time(
            backlog_crud.get_root_backlogs, self.db
        )
        
        return results
    
    def test_search_queries(self) -> Dict[str, Any]:
        """Test search functionality"""
        results = {}
        
        # Test full-text search
        results["full_text_search"] = self.measure_query_time(
            backlog_crud.search_backlogs, self.db, "user", use_full_text_search=True
        )
        
        # Test ILIKE search
        results["ilike_search"] = self.measure_query_time(
            backlog_crud.search_backlogs, self.db, "user", use_full_text_search=False
        )
        
        return results
    
    def test_hierarchical_queries(self) -> Dict[str, Any]:
        """Test hierarchical query performance"""
        results = {}
        
        # Get a root item for testing
        root_items = backlog_crud.get_root_backlogs(self.db, limit=1)
        if root_items:
            root_id = root_items[0].backlog_id
            
            # Test getting children
            results["get_children"] = self.measure_query_time(
                backlog_crud.get_children, self.db, root_id
            )
            
            # Test getting descendants
            results["get_descendants"] = self.measure_query_time(
                backlog_crud.get_children, self.db, root_id, include_descendants=True
            )
            
            # Test getting full tree
            results["get_backlog_tree"] = self.measure_query_time(
                backlog_crud.get_backlog_tree, self.db, root_id
            )
        
        return results
    
    def test_filtered_queries(self) -> Dict[str, Any]:
        """Test filtered queries"""
        results = {}
        
        # Test project-specific queries
        results["get_by_project"] = self.measure_query_time(
            backlog_crud.get_backlogs_by_project, self.db, 1
        )
        
        # Test sprint-specific queries
        results["get_by_sprint"] = self.measure_query_time(
            backlog_crud.get_backlogs_by_sprint, self.db, 1
        )
        
        # Test assignee-specific queries
        results["get_by_assignee"] = self.measure_query_time(
            backlog_crud.get_backlogs_by_assignee, self.db, 1
        )
        
        # Test overdue queries
        results["get_overdue"] = self.measure_query_time(
            backlog_crud.get_overdue_backlogs, self.db
        )
        
        return results
    
    def test_statistics_queries(self) -> Dict[str, Any]:
        """Test statistics and aggregation queries"""
        results = {}
        
        # Test counting backlogs
        results["count_backlogs"] = self.measure_query_time(
            backlog_crud.count_backlogs, self.db
        )
        
        # Test getting statistics
        results["get_statistics"] = self.measure_query_time(
            backlog_crud.get_backlog_statistics, self.db
        )
        
        return results
    
    def test_index_usage(self) -> Dict[str, Any]:
        """Test if indexes are being used effectively"""
        results = {}
        
        # Check index usage for different query patterns
        query_patterns = [
            ("project_status", "SELECT * FROM backlogs WHERE project_id = 1 AND status = 'todo'"),
            ("sprint_status", "SELECT * FROM backlogs WHERE sprint_id = 1 AND status = 'in_progress'"),
            ("priority_status", "SELECT * FROM backlogs WHERE priority = 'high' AND status = 'todo'"),
            ("full_text_search", "SELECT * FROM backlogs WHERE to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ to_tsquery('english', 'user')"),
        ]
        
        for name, query in query_patterns:
            results[name] = self.measure_query_time(
                lambda: self.db.execute(text(query)).fetchall()
            )
        
        return results
    
    def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run comprehensive performance test"""
        print("Running comprehensive backlog performance test...")
        
        results = {
            "basic_queries": self.test_basic_queries(),
            "search_queries": self.test_search_queries(),
            "hierarchical_queries": self.test_hierarchical_queries(),
            "filtered_queries": self.test_filtered_queries(),
            "statistics_queries": self.test_statistics_queries(),
            "index_usage": self.test_index_usage(),
        }
        
        # Calculate summary statistics
        total_time = 0
        total_queries = 0
        
        for category, category_results in results.items():
            for query_name, query_result in category_results.items():
                if isinstance(query_result, dict) and "execution_time" in query_result:
                    total_time += query_result["execution_time"]
                    total_queries += 1
        
        results["summary"] = {
            "total_execution_time": total_time,
            "total_queries": total_queries,
            "average_query_time": total_time / total_queries if total_queries > 0 else 0
        }
        
        return results
    
    def print_performance_report(self, results: Dict[str, Any]):
        """Print a formatted performance report"""
        print("\n" + "="*60)
        print("BACKLOG PERFORMANCE REPORT")
        print("="*60)
        
        for category, category_results in results.items():
            if category == "summary":
                continue
                
            print(f"\n{category.upper().replace('_', ' ')}:")
            print("-" * 40)
            
            for query_name, query_result in category_results.items():
                if isinstance(query_result, dict) and "execution_time" in query_result:
                    time_ms = query_result["execution_time"] * 1000
                    count = query_result.get("result_count", 0)
                    print(f"  {query_name}: {time_ms:.2f}ms ({count} results)")
        
        if "summary" in results:
            summary = results["summary"]
            print(f"\nSUMMARY:")
            print("-" * 40)
            print(f"  Total execution time: {summary['total_execution_time']:.3f}s")
            print(f"  Total queries: {summary['total_queries']}")
            print(f"  Average query time: {summary['average_query_time']*1000:.2f}ms")
        
        print("\n" + "="*60)

def run_backlog_performance_test(db: Session):
    """Run the backlog performance test"""
    monitor = BacklogPerformanceMonitor(db)
    results = monitor.run_comprehensive_test()
    monitor.print_performance_report(results)
    return results 