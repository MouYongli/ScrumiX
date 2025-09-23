# ScrumiX Backend Test Suite

This directory contains comprehensive unit and integration tests for the ScrumiX backend API.

## Test Structure

```
tests/
├── __init__.py
├── conftest.py              # Pytest configuration and fixtures
├── test_auth.py             # Authentication and security tests
├── test_users.py            # User management tests
├── test_projects.py         # Project management tests
├── test_backlogs.py         # Backlog management tests
├── test_sprints.py          # Sprint management tests
├── test_tasks.py            # Task management tests
└── README.md               # This file
```

## Test Coverage

The test suite provides comprehensive coverage for:

### 🔐 Authentication & Security
- User registration and login
- Password management
- OAuth integration
- Token management
- Session handling
- Security utilities

### 👥 User Management
- User CRUD operations
- Profile management
- Session management
- Role-based access control
- User validation

### 📋 Project Management
- Project CRUD operations
- Project status management
- Project search and filtering
- Project validation

### 📝 Backlog Management
- Backlog item CRUD operations
- Status and priority management
- Search and filtering
- Hierarchical backlog structure
- Story point estimation

### 🏃 Sprint Management
- Sprint CRUD operations
- Sprint status management
- Date validation
- Sprint search and filtering

### ✅ Task Management
- Task CRUD operations
- Task status management
- Task assignment
- Task search and filtering
- Pagination support

## Running Tests

### Prerequisites

1. Install test dependencies:
```bash
pip install -e .[dev]
```

2. Ensure PostgreSQL container is running:
```bash
cd ../docker
docker-compose -f docker-compose.local.yaml up -d scrumix-postgres
```

### Running All Tests

```bash
# Run all tests with coverage
python run_tests.py

# Or using pytest directly
pytest tests/ -v --cov=src/scrumix --cov-report=term-missing
```

### Running Specific Test Categories

```bash
# Run only unit tests
python run_tests.py unit

# Run only integration tests
python run_tests.py integration

# Run specific test file
python run_tests.py specific auth

# Run specific test class
pytest tests/test_auth.py::TestAuthEndpoints -v

# Run specific test method
pytest tests/test_auth.py::TestAuthEndpoints::test_login_success -v
```

### Coverage Reports

```bash
# Show coverage report
python run_tests.py coverage

# Generate HTML coverage report
pytest --cov=src/scrumix --cov-report=html:htmlcov tests/
```

## Test Configuration

### Database Setup
- Tests use SQLite in-memory database for fast execution
- Each test gets a fresh database session
- Tables are created and dropped for each test

### Authentication
- Mock authentication for protected endpoints
- Test users with different permission levels
- JWT token generation for testing

### Fixtures
- `client`: FastAPI test client
- `db_session`: Database session
- `test_user`: Regular test user
- `test_superuser`: Admin test user
- `auth_headers`: Authentication headers
- `superuser_auth_headers`: Admin authentication headers

## Test Categories

### Unit Tests
- Individual function testing
- CRUD operation testing
- Validation logic testing
- Utility function testing

### Integration Tests
- API endpoint testing
- Database integration testing
- Authentication flow testing
- Error handling testing

## Coverage Requirements

- **Minimum Coverage**: 80%
- **Coverage Reports**: HTML, XML, and terminal output
- **Coverage Failures**: Tests will fail if coverage drops below 80%

## Test Best Practices

### Writing Tests
1. **Descriptive Names**: Use clear, descriptive test method names
2. **Arrange-Act-Assert**: Structure tests with clear sections
3. **Isolation**: Each test should be independent
4. **Mocking**: Mock external dependencies appropriately
5. **Edge Cases**: Test error conditions and edge cases

### Test Data
1. **Fixtures**: Use pytest fixtures for common test data
2. **Factories**: Create test data factories for complex objects
3. **Cleanup**: Ensure proper cleanup after tests
4. **Realistic Data**: Use realistic but safe test data

### Assertions
1. **Specific**: Make assertions as specific as possible
2. **Descriptive**: Use descriptive assertion messages
3. **Multiple**: Test multiple aspects of responses
4. **Error Cases**: Test both success and failure scenarios

## Debugging Tests

### Running Tests in Debug Mode
```bash
# Run with more verbose output
pytest tests/ -v -s

# Run with debugger
pytest tests/ --pdb

# Run specific failing test
pytest tests/test_auth.py::TestAuthEndpoints::test_login_success -v -s
```

### Common Issues
1. **Database Issues**: Ensure test database is properly configured
2. **Import Issues**: Check Python path and module imports
3. **Authentication Issues**: Verify JWT token generation
4. **Async Issues**: Use proper async/await patterns

## Continuous Integration

The test suite is designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    cd backend
    pip install -e .[dev]
    python run_tests.py
```

## Performance

- **Fast Execution**: Tests use in-memory SQLite
- **Parallel Execution**: Tests can run in parallel
- **Minimal Dependencies**: Only essential test dependencies
- **Efficient Setup**: Optimized fixture usage

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Add appropriate fixtures
3. Include both success and failure cases
4. Update this README if needed
5. Ensure coverage remains above 80%

## Test Maintenance

- **Regular Updates**: Keep tests updated with code changes
- **Coverage Monitoring**: Monitor coverage trends
- **Performance Monitoring**: Track test execution time
- **Dependency Updates**: Keep test dependencies updated 