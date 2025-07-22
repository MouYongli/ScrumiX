"""
Comprehensive Sprint CRUD tests for major coverage boost
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session

from scrumix.api.crud.sprint import SprintCRUD
from scrumix.api.models.sprint import Sprint, SprintStatus
from scrumix.api.schemas.sprint import SprintCreate, SprintUpdate


class TestSprintCRUDComprehensive:
    """Comprehensive tests for SprintCRUD to boost coverage significantly"""

    @pytest.fixture
    def sprint_crud(self):
        """Create SprintCRUD instance"""
        return SprintCRUD(Sprint)

    @pytest.fixture
    def mock_db(self):
        """Create mock database session"""
        return MagicMock(spec=Session)

    @pytest.fixture
    def sample_sprint(self):
        """Create sample sprint for testing"""
        sprint = MagicMock(spec=Sprint)
        sprint.sprint_id = 1
        sprint.sprint_name = "Sprint 1"
        sprint.sprint_goal = "Deliver user authentication"
        sprint.start_date = datetime.now()
        sprint.end_date = datetime.now() + timedelta(days=14)
        sprint.status = SprintStatus.PLANNED
        sprint.sprint_capacity = 40
        sprint.created_at = datetime.now()
        return sprint

    def test_create_sprint_success(self, sprint_crud, mock_db, sample_sprint):
        """Test successful sprint creation"""
        sprint_create = SprintCreate(
            sprint_name="New Sprint",
            sprint_goal="Test goal",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status="planned",
            sprint_capacity=40
        )
        
        with patch.object(sprint_crud, 'get_by_name') as mock_get_by_name:
            mock_get_by_name.return_value = None  # No existing sprint
            mock_db.add = MagicMock()
            mock_db.commit = MagicMock()
            mock_db.refresh = MagicMock()
            
            result = sprint_crud.create_sprint(mock_db, sprint_create)
            
            mock_db.add.assert_called_once()
            mock_db.commit.assert_called_once()

    def test_create_sprint_duplicate_name(self, sprint_crud, mock_db, sample_sprint):
        """Test sprint creation with duplicate name"""
        sprint_create = SprintCreate(
            sprint_name="Sprint 1",  # Same as existing
            sprint_goal="Test goal",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status="planned"
        )
        
        with patch.object(sprint_crud, 'get_by_name') as mock_get_by_name:
            mock_get_by_name.return_value = sample_sprint  # Existing sprint found
            
            with pytest.raises(ValueError, match="Sprint with this name already exists"):
                sprint_crud.create_sprint(mock_db, sprint_create)

    def test_create_sprint_invalid_dates(self, sprint_crud, mock_db):
        """Test sprint creation with invalid date range"""
        start_date = datetime.now()
        sprint_create = SprintCreate(
            sprint_name="Invalid Sprint",
            sprint_goal="Test goal",
            start_date=start_date,
            end_date=start_date - timedelta(days=1),  # End before start
            status="planned"
        )
        
        with patch.object(sprint_crud, 'get_by_name') as mock_get_by_name:
            mock_get_by_name.return_value = None
            
            with pytest.raises(ValueError, match="End date must be after start date"):
                sprint_crud.create_sprint(mock_db, sprint_create)

    def test_get_by_id_found(self, sprint_crud, mock_db, sample_sprint):
        """Test get_by_id when sprint exists"""
        with patch.object(sprint_crud, 'get') as mock_get:
            mock_get.return_value = sample_sprint
            
            result = sprint_crud.get_by_id(mock_db, 1)
            
            assert result == sample_sprint
            mock_get.assert_called_once_with(mock_db, 1)

    def test_get_by_id_not_found(self, sprint_crud, mock_db):
        """Test get_by_id when sprint doesn't exist"""
        with patch.object(sprint_crud, 'get') as mock_get:
            mock_get.return_value = None
            
            result = sprint_crud.get_by_id(mock_db, 999)
            
            assert result is None

    def test_get_by_name_found(self, sprint_crud, mock_db, sample_sprint):
        """Test get_by_name when sprint exists"""
        mock_db.query().filter().first.return_value = sample_sprint
        
        result = sprint_crud.get_by_name(mock_db, "Sprint 1")
        
        assert result == sample_sprint

    def test_get_by_name_not_found(self, sprint_crud, mock_db):
        """Test get_by_name when sprint doesn't exist"""
        mock_db.query().filter().first.return_value = None
        
        result = sprint_crud.get_by_name(mock_db, "Nonexistent Sprint")
        
        assert result is None

    def test_get_sprints_list(self, sprint_crud, mock_db):
        """Test get_sprints method"""
        mock_sprints = [MagicMock(), MagicMock()]
        mock_db.query().order_by().offset().limit().all.return_value = mock_sprints
        
        result = sprint_crud.get_sprints(mock_db, skip=0, limit=10)
        
        assert result == mock_sprints

    def test_get_sprints_with_status_filter(self, sprint_crud, mock_db):
        """Test get_sprints with status filter"""
        mock_sprints = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_sprints
        
        result = sprint_crud.get_sprints(mock_db, status=SprintStatus.ACTIVE)
        
        assert result == mock_sprints

    def test_search_sprints(self, sprint_crud, mock_db):
        """Test search_sprints method"""
        mock_sprints = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_sprints
        
        result = sprint_crud.search_sprints(mock_db, "test search")
        
        assert result == mock_sprints

    def test_update_sprint_success(self, sprint_crud, mock_db, sample_sprint):
        """Test successful sprint update"""
        sprint_update = SprintUpdate(sprint_goal="Updated goal")
        
        with patch.object(sprint_crud, 'get_by_id') as mock_get_id:
            mock_get_id.return_value = sample_sprint
            mock_db.commit = MagicMock()
            mock_db.refresh = MagicMock()
            
            result = sprint_crud.update_sprint(mock_db, 1, sprint_update)
            
            assert result == sample_sprint
            mock_db.commit.assert_called_once()

    def test_update_sprint_not_found(self, sprint_crud, mock_db):
        """Test update_sprint when sprint doesn't exist"""
        sprint_update = SprintUpdate(sprint_goal="Updated goal")
        
        with patch.object(sprint_crud, 'get_by_id') as mock_get_id:
            mock_get_id.return_value = None
            
            result = sprint_crud.update_sprint(mock_db, 999, sprint_update)
            
            assert result is None

    def test_update_sprint_duplicate_name(self, sprint_crud, mock_db, sample_sprint):
        """Test update_sprint with duplicate name"""
        sprint_update = SprintUpdate(sprint_name="Existing Sprint")
        existing_sprint = MagicMock()
        existing_sprint.sprint_id = 2  # Different sprint
        
        with patch.object(sprint_crud, 'get_by_id') as mock_get_id, \
             patch.object(sprint_crud, 'get_by_name') as mock_get_by_name:
            
            mock_get_id.return_value = sample_sprint
            mock_get_by_name.return_value = existing_sprint
            
            with pytest.raises(ValueError, match="Sprint with this name already exists"):
                sprint_crud.update_sprint(mock_db, 1, sprint_update)

    def test_delete_sprint_success(self, sprint_crud, mock_db, sample_sprint):
        """Test successful sprint deletion"""
        with patch.object(sprint_crud, 'get_by_id') as mock_get_id:
            mock_get_id.return_value = sample_sprint
            mock_db.delete = MagicMock()
            mock_db.commit = MagicMock()
            
            result = sprint_crud.delete_sprint(mock_db, 1)
            
            assert result is True
            mock_db.delete.assert_called_once_with(sample_sprint)
            mock_db.commit.assert_called_once()

    def test_delete_sprint_not_found(self, sprint_crud, mock_db):
        """Test delete_sprint when sprint doesn't exist"""
        with patch.object(sprint_crud, 'get_by_id') as mock_get_id:
            mock_get_id.return_value = None
            
            result = sprint_crud.delete_sprint(mock_db, 999)
            
            assert result is False

    def test_get_sprints_by_status(self, sprint_crud, mock_db):
        """Test get_sprints_by_status method"""
        mock_sprints = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_sprints
        
        result = sprint_crud.get_sprints_by_status(mock_db, SprintStatus.ACTIVE)
        
        assert result == mock_sprints

    def test_get_active_sprints(self, sprint_crud, mock_db):
        """Test get_active_sprints method"""
        mock_sprints = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_sprints
        
        result = sprint_crud.get_active_sprints(mock_db)
        
        assert result == mock_sprints

    def test_get_upcoming_sprints(self, sprint_crud, mock_db):
        """Test get_upcoming_sprints method"""
        mock_sprints = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_sprints
        
        result = sprint_crud.get_upcoming_sprints(mock_db, days_ahead=30)
        
        assert result == mock_sprints

    def test_get_sprints_by_date_range(self, sprint_crud, mock_db):
        """Test get_sprints_by_date_range method"""
        mock_sprints = [MagicMock()]
        mock_db.query().filter().order_by().offset().limit().all.return_value = mock_sprints
        
        start_date = datetime.now()
        end_date = start_date + timedelta(days=30)
        
        result = sprint_crud.get_sprints_by_date_range(mock_db, start_date, end_date)
        
        assert result == mock_sprints

    def test_count_sprints_total(self, sprint_crud, mock_db):
        """Test count_sprints for total count"""
        mock_db.query().count.return_value = 15
        
        result = sprint_crud.count_sprints(mock_db)
        
        assert result == 15

    def test_count_sprints_by_status(self, sprint_crud, mock_db):
        """Test count_sprints by status"""
        mock_db.query().filter().count.return_value = 5
        
        result = sprint_crud.count_sprints(mock_db, status=SprintStatus.ACTIVE)
        
        assert result == 5

    def test_get_sprint_statistics(self, sprint_crud, mock_db):
        """Test get_sprint_statistics method"""
        # Mock the various count queries
        mock_db.query().count.return_value = 20  # total count
        mock_db.query().filter().count.side_effect = [3, 5, 7, 2, 3]  # status counts
        
        result = sprint_crud.get_sprint_statistics(mock_db)
        
        assert isinstance(result, dict)
        assert "total" in result

    def test_close_sprint_success(self, sprint_crud, mock_db, sample_sprint):
        """Test successful sprint closure"""
        with patch.object(sprint_crud, 'get_by_id') as mock_get_id:
            mock_get_id.return_value = sample_sprint
            mock_db.commit = MagicMock()
            mock_db.refresh = MagicMock()
            
            result = sprint_crud.close_sprint(mock_db, 1)
            
            assert result == sample_sprint
            assert sample_sprint.status == SprintStatus.COMPLETED
            mock_db.commit.assert_called_once()

    def test_close_sprint_not_found(self, sprint_crud, mock_db):
        """Test close_sprint when sprint doesn't exist"""
        with patch.object(sprint_crud, 'get_by_id') as mock_get_id:
            mock_get_id.return_value = None
            
            result = sprint_crud.close_sprint(mock_db, 999)
            
            assert result is None

    def test_start_sprint_success(self, sprint_crud, mock_db, sample_sprint):
        """Test successful sprint start"""
        with patch.object(sprint_crud, 'get_by_id') as mock_get_id:
            mock_get_id.return_value = sample_sprint
            mock_db.commit = MagicMock()
            mock_db.refresh = MagicMock()
            
            result = sprint_crud.start_sprint(mock_db, 1)
            
            assert result == sample_sprint
            assert sample_sprint.status == SprintStatus.ACTIVE
            mock_db.commit.assert_called_once()

    def test_start_sprint_not_found(self, sprint_crud, mock_db):
        """Test start_sprint when sprint doesn't exist"""
        with patch.object(sprint_crud, 'get_by_id') as mock_get_id:
            mock_get_id.return_value = None
            
            result = sprint_crud.start_sprint(mock_db, 999)
            
            assert result is None 