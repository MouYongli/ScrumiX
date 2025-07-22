"""
Comprehensive CRUD tests for major coverage boost
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session

from scrumix.api.crud.backlog import BacklogCRUD
from scrumix.api.models.backlog import Backlog, BacklogStatus, BacklogPriority
from scrumix.api.schemas.backlog import BacklogCreate, BacklogUpdate


class TestBacklogCRUD:
    """Comprehensive tests for BacklogCRUD to boost coverage"""

    @pytest.fixture
    def backlog_crud(self):
        """Create BacklogCRUD instance"""
        return BacklogCRUD(Backlog)

    @pytest.fixture
    def mock_db(self):
        """Create mock database session"""
        return MagicMock(spec=Session)

    @pytest.fixture
    def sample_backlog(self):
        """Create sample backlog for testing"""
        backlog = MagicMock(spec=Backlog)
        backlog.backlog_id = 1
        backlog.title = "Test Backlog"
        backlog.status = BacklogStatus.TODO
        backlog.priority = BacklogPriority.MEDIUM
        backlog.level = 0
        backlog.path = "/1/"
        backlog.parent_id = None
        backlog.root_id = 1
        backlog.project_id = 1
        backlog.created_at = datetime.now()
        return backlog

    def test_get_by_id_found(self, backlog_crud, mock_db, sample_backlog):
        """Test get_by_id when backlog exists"""
        mock_db.query().filter().first.return_value = sample_backlog
        
        result = backlog_crud.get_by_id(mock_db, 1)
        
        assert result == sample_backlog
        mock_db.query.assert_called_once_with(Backlog)

    def test_get_by_id_not_found(self, backlog_crud, mock_db):
        """Test get_by_id when backlog doesn't exist"""
        mock_db.query().filter().first.return_value = None
        
        result = backlog_crud.get_by_id(mock_db, 999)
        
        assert result is None

    def test_create_backlog_success(self, backlog_crud, mock_db, sample_backlog):
        """Test successful backlog creation"""
        backlog_create = BacklogCreate(
            title="New Backlog",
            description="Test description",
            status="todo",
            priority="medium",
            project_id=1
        )
        
        mock_db.add = MagicMock()
        mock_db.commit = MagicMock()
        mock_db.refresh = MagicMock()
        
        with patch.object(backlog_crud, '_initialize_tree_fields') as mock_init:
            mock_init.return_value = sample_backlog
            
            result = backlog_crud.create_backlog(mock_db, backlog_create)
            
            assert result == sample_backlog
            mock_db.add.assert_called_once()
            mock_db.commit.assert_called_once()

    def test_get_backlogs_basic(self, backlog_crud, mock_db):
        """Test get_backlogs with basic parameters"""
        mock_backlogs = [MagicMock(), MagicMock()]
        mock_db.query().order_by().offset().limit().all.return_value = mock_backlogs
        
        result = backlog_crud.get_backlogs(mock_db, skip=0, limit=10)
        
        assert result == mock_backlogs
        mock_db.query.assert_called_once_with(Backlog)

    def test_get_backlogs_with_status_filter(self, backlog_crud, mock_db):
        """Test get_backlogs with status filter"""
        mock_backlogs = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_backlogs
        
        result = backlog_crud.get_backlogs(mock_db, status="todo")
        
        assert result == mock_backlogs

    def test_get_backlogs_with_priority_filter(self, backlog_crud, mock_db):
        """Test get_backlogs with priority filter"""
        mock_backlogs = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_backlogs
        
        result = backlog_crud.get_backlogs(mock_db, priority="high")
        
        assert result == mock_backlogs

    def test_get_backlogs_with_project_filter(self, backlog_crud, mock_db):
        """Test get_backlogs with project_id filter"""
        mock_backlogs = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_backlogs
        
        result = backlog_crud.get_backlogs(mock_db, project_id=1)
        
        assert result == mock_backlogs

    def test_get_backlogs_root_only(self, backlog_crud, mock_db):
        """Test get_backlogs with root_only filter"""
        mock_backlogs = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_backlogs
        
        result = backlog_crud.get_backlogs(mock_db, root_only=True)
        
        assert result == mock_backlogs

    def test_get_root_backlogs(self, backlog_crud, mock_db):
        """Test get_root_backlogs method"""
        mock_backlogs = [MagicMock(), MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_backlogs
        
        result = backlog_crud.get_root_backlogs(mock_db, skip=0, limit=10)
        
        assert result == mock_backlogs
        mock_db.query.assert_called_once_with(Backlog)

    def test_get_children_direct_only(self, backlog_crud, mock_db):
        """Test get_children for direct children only"""
        mock_children = [MagicMock(), MagicMock()]
        mock_db.query().filter().order_by().all.return_value = mock_children
        
        result = backlog_crud.get_children(mock_db, parent_id=1, include_descendants=False)
        
        assert result == mock_children

    def test_get_children_with_descendants(self, backlog_crud, mock_db, sample_backlog):
        """Test get_children including descendants"""
        mock_children = [MagicMock(), MagicMock()]
        mock_db.query().filter().order_by().all.return_value = mock_children
        
        with patch.object(backlog_crud, 'get_by_id') as mock_get:
            mock_get.return_value = sample_backlog
            
            result = backlog_crud.get_children(mock_db, parent_id=1, include_descendants=True)
            
            assert result == mock_children

    def test_search_backlogs(self, backlog_crud, mock_db):
        """Test search_backlogs method"""
        mock_results = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_results
        
        result = backlog_crud.search_backlogs(mock_db, search_term="test")
        
        assert result == mock_results

    def test_get_backlogs_by_status(self, backlog_crud, mock_db):
        """Test get_backlogs_by_status method"""
        mock_backlogs = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_backlogs
        
        result = backlog_crud.get_backlogs_by_status(mock_db, BacklogStatus.TODO)
        
        assert result == mock_backlogs

    def test_get_backlogs_by_priority(self, backlog_crud, mock_db):
        """Test get_backlogs_by_priority method"""
        mock_backlogs = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_backlogs
        
        result = backlog_crud.get_backlogs_by_priority(mock_db, BacklogPriority.HIGH)
        
        assert result == mock_backlogs

    def test_get_overdue_backlogs(self, backlog_crud, mock_db):
        """Test get_overdue_backlogs method"""
        mock_backlogs = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_backlogs
        
        result = backlog_crud.get_overdue_backlogs(mock_db)
        
        assert result == mock_backlogs

    def test_get_backlogs_by_project(self, backlog_crud, mock_db):
        """Test get_backlogs_by_project method"""
        mock_backlogs = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_backlogs
        
        result = backlog_crud.get_backlogs_by_project(mock_db, project_id=1)
        
        assert result == mock_backlogs

    def test_get_backlogs_by_sprint(self, backlog_crud, mock_db):
        """Test get_backlogs_by_sprint method"""
        mock_backlogs = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_backlogs
        
        result = backlog_crud.get_backlogs_by_sprint(mock_db, sprint_id=1)
        
        assert result == mock_backlogs

    def test_get_backlogs_by_assignee(self, backlog_crud, mock_db):
        """Test get_backlogs_by_assignee method"""
        mock_backlogs = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_backlogs
        
        result = backlog_crud.get_backlogs_by_assignee(mock_db, user_id=1)
        
        assert result == mock_backlogs

    def test_count_backlogs_total(self, backlog_crud, mock_db):
        """Test count_backlogs for total count"""
        mock_db.query().count.return_value = 42
        
        result = backlog_crud.count_backlogs(mock_db)
        
        assert result == 42

    def test_count_backlogs_by_status(self, backlog_crud, mock_db):
        """Test count_backlogs by status"""
        mock_db.query().filter().count.return_value = 15
        
        result = backlog_crud.count_backlogs(mock_db, status="todo")
        
        assert result == 15

    def test_count_backlogs_by_project(self, backlog_crud, mock_db):
        """Test count_backlogs by project"""
        mock_db.query().filter().count.return_value = 25
        
        result = backlog_crud.count_backlogs(mock_db, project_id=1)
        
        assert result == 25

    def test_get_backlog_statistics(self, backlog_crud, mock_db):
        """Test get_backlog_statistics method"""
        # Mock the various count queries
        mock_db.query().count.return_value = 10  # total count
        mock_db.query().filter().count.side_effect = [3, 2, 4, 1]  # status counts
        
        result = backlog_crud.get_backlog_statistics(mock_db)
        
        assert isinstance(result, dict)
        assert "total" in result

    def test_update_backlog_success(self, backlog_crud, mock_db, sample_backlog):
        """Test successful backlog update"""
        backlog_update = BacklogUpdate(title="Updated Title")
        
        with patch.object(backlog_crud, 'get_by_id') as mock_get:
            mock_get.return_value = sample_backlog
            mock_db.commit = MagicMock()
            mock_db.refresh = MagicMock()
            
            result = backlog_crud.update_backlog(mock_db, 1, backlog_update)
            
            assert result == sample_backlog
            mock_db.commit.assert_called_once()

    def test_update_backlog_not_found(self, backlog_crud, mock_db):
        """Test update_backlog when backlog doesn't exist"""
        backlog_update = BacklogUpdate(title="Updated Title")
        
        with patch.object(backlog_crud, 'get_by_id') as mock_get:
            mock_get.return_value = None
            
            result = backlog_crud.update_backlog(mock_db, 999, backlog_update)
            
            assert result is None

    def test_delete_backlog_success(self, backlog_crud, mock_db, sample_backlog):
        """Test successful backlog deletion"""
        with patch.object(backlog_crud, 'get_by_id') as mock_get:
            mock_get.return_value = sample_backlog
            mock_db.delete = MagicMock()
            mock_db.commit = MagicMock()
            
            result = backlog_crud.delete_backlog(mock_db, 1, delete_children=False)
            
            assert result is True
            mock_db.delete.assert_called_once_with(sample_backlog)
            mock_db.commit.assert_called_once()

    def test_delete_backlog_not_found(self, backlog_crud, mock_db):
        """Test delete_backlog when backlog doesn't exist"""
        with patch.object(backlog_crud, 'get_by_id') as mock_get:
            mock_get.return_value = None
            
            result = backlog_crud.delete_backlog(mock_db, 999)
            
            assert result is False

    def test_delete_backlog_with_children(self, backlog_crud, mock_db, sample_backlog):
        """Test delete_backlog with children deletion"""
        mock_children = [MagicMock(), MagicMock()]
        
        with patch.object(backlog_crud, 'get_by_id') as mock_get, \
             patch.object(backlog_crud, 'get_children') as mock_get_children:
            
            mock_get.return_value = sample_backlog
            mock_get_children.return_value = mock_children
            mock_db.delete = MagicMock()
            mock_db.commit = MagicMock()
            
            result = backlog_crud.delete_backlog(mock_db, 1, delete_children=True)
            
            assert result is True
            # Should delete children first, then parent
            assert mock_db.delete.call_count == 3  # 2 children + 1 parent

    def test_bulk_update_status(self, backlog_crud, mock_db):
        """Test bulk_update_status method"""
        mock_backlogs = [MagicMock(), MagicMock()]
        mock_db.query().filter().all.return_value = mock_backlogs
        mock_db.commit = MagicMock()
        
        result = backlog_crud.bulk_update_status(mock_db, [1, 2], BacklogStatus.DONE)
        
        assert result == 2  # Updated count
        mock_db.commit.assert_called_once()

    def test_get_backlog_hierarchy(self, backlog_crud, mock_db):
        """Test get_backlog_hierarchy method"""
        mock_roots = [MagicMock()]
        mock_db.query().filter().order_by().all.return_value = mock_roots
        
        with patch.object(backlog_crud, '_build_hierarchy_dict') as mock_build:
            mock_build.return_value = {"id": 1, "title": "Root", "children": []}
            
            result = backlog_crud.get_backlog_hierarchy(mock_db, project_id=1)
            
            assert isinstance(result, list)

    def test_get_backlog_tree_found(self, backlog_crud, mock_db, sample_backlog):
        """Test get_backlog_tree when root exists"""
        mock_descendants = [MagicMock(), MagicMock()]
        
        with patch.object(backlog_crud, 'get_by_id') as mock_get, \
             patch.object(backlog_crud, '_build_tree_from_list') as mock_build:
            
            mock_get.return_value = sample_backlog
            mock_db.query().filter().order_by().all.return_value = mock_descendants
            
            result = backlog_crud.get_backlog_tree(mock_db, 1)
            
            assert result == sample_backlog
            mock_build.assert_called_once()

    def test_get_backlog_tree_not_found(self, backlog_crud, mock_db):
        """Test get_backlog_tree when root doesn't exist"""
        with patch.object(backlog_crud, 'get_by_id') as mock_get:
            mock_get.return_value = None
            
            result = backlog_crud.get_backlog_tree(mock_db, 999)
            
            assert result is None 