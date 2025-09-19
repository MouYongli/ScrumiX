# ScrumiX Backend

A FastAPI-based backend service for the ScrumiX AI-powered Scrum management system. This backend provides RESTful APIs for project management, user authentication, task tracking, sprint management, and AI-powered features.

## Features

- **FastAPI Framework**: Modern, fast web framework for building APIs
- **SQLAlchemy ORM**: Database abstraction and management
- **PostgreSQL Support**: Primary database with SQLite fallback for testing
- **JWT Authentication**: Secure token-based authentication
- **Keycloak Integration**: OAuth2/OIDC authentication support
- **Vector Database**: PGVector integration for AI embeddings
- **Comprehensive Testing**: Pytest-based test suite with high coverage
- **Database Migrations**: Alembic for schema management
- **API Documentation**: Automatic OpenAPI/Swagger documentation

## Project Structure

```
backend/
├── src/
│   └── scrumix/
│       ├── __init__.py
│       ├── main.py                    # FastAPI application entry point
│       └── api/                       # API layer
│           ├── __init__.py
│           ├── app.py                 # FastAPI app configuration
│           ├── core/                  # Core configuration and utilities
│           │   ├── __init__.py
│           │   ├── celery_app.py      # Celery task queue configuration
│           │   ├── config.py          # Application settings and configuration
│           │   ├── embedding_service.py # AI embedding service
│           │   ├── init_db.py         # Database initialization
│           │   ├── permissions.py     # Permission management
│           │   └── security.py        # Authentication and security
│           ├── db/                    # Database layer
│           │   ├── __init__.py
│           │   ├── base.py            # SQLAlchemy Base class
│           │   ├── database.py        # Database connection and session
│           │   ├── migrations/        # Custom migration scripts
│           │   ├── models.py          # Database model registry
│           │   └── session.py         # Database session management
│           ├── models/                # SQLAlchemy ORM models
│           │   ├── __init__.py
│           │   ├── acceptance_criteria.py
│           │   ├── backlog.py
│           │   ├── burndown_snapshot.py
│           │   ├── chat.py
│           │   ├── documentation.py
│           │   ├── meeting_action_item.py
│           │   ├── meeting_agenda.py
│           │   ├── meeting_note.py
│           │   ├── meeting_participant.py
│           │   ├── meeting.py
│           │   ├── notification.py
│           │   ├── personal_note.py
│           │   ├── project.py
│           │   ├── sprint.py
│           │   ├── tag_documentation.py
│           │   ├── tag_task.py
│           │   ├── tag.py
│           │   ├── task.py
│           │   ├── user_documentation.py
│           │   ├── user_notification_preference.py
│           │   ├── user_project.py
│           │   ├── user_task.py
│           │   └── user.py
│           ├── schemas/               # Pydantic data validation models
│           │   ├── __init__.py
│           │   ├── acceptance_criteria.py
│           │   ├── backlog.py
│           │   ├── burndown_snapshot.py
│           │   ├── chat.py
│           │   ├── documentation.py
│           │   ├── meeting_action_item.py
│           │   ├── meeting_agenda.py
│           │   ├── meeting_note.py
│           │   ├── meeting_participant.py
│           │   ├── meeting.py
│           │   ├── notification.py
│           │   ├── personal_note.py
│           │   ├── project.py
│           │   ├── sprint.py
│           │   ├── tag.py
│           │   ├── task.py
│           │   ├── user_notification_preference.py
│           │   ├── user_project.py
│           │   └── user.py
│           ├── crud/                  # Database CRUD operations
│           │   ├── __init__.py
│           │   ├── acceptance_criteria.py
│           │   ├── backlog.py
│           │   ├── base.py            # Base CRUD class
│           │   ├── burndown_snapshot.py
│           │   ├── chat.py
│           │   ├── documentation.py
│           │   ├── meeting_action_item.py
│           │   ├── meeting_agenda.py
│           │   ├── meeting_note.py
│           │   ├── meeting_participant.py
│           │   ├── meeting.py
│           │   ├── notification.py
│           │   ├── personal_note.py
│           │   ├── project.py
│           │   ├── sprint_backlog.py
│           │   ├── sprint.py
│           │   ├── tag.py
│           │   ├── task.py
│           │   ├── user_documentation.py
│           │   ├── user_notification_preference.py
│           │   ├── user_project.py
│           │   ├── user_task.py
│           │   └── user.py
│           ├── routes/                # FastAPI route handlers
│           │   ├── __init__.py
│           │   ├── acceptance_criteria.py
│           │   ├── auth.py            # Authentication routes
│           │   ├── backlogs.py
│           │   ├── chat.py            # AI chat functionality
│           │   ├── documentations.py
│           │   ├── meeting_action_item.py
│           │   ├── meeting_agenda.py
│           │   ├── meeting_note.py
│           │   ├── meeting_participants.py
│           │   ├── meetings.py
│           │   ├── notifications.py
│           │   ├── personal_notes.py
│           │   ├── projects.py
│           │   ├── semantic_search.py # AI-powered search
│           │   ├── sprints.py
│           │   ├── tags.py
│           │   ├── tasks.py
│           │   ├── user_notification_preferences.py
│           │   ├── users.py
│           │   ├── velocity.py        # Velocity tracking
│           │   └── workspace.py
│           ├── services/              # Business logic services
│           │   └── velocity_tracking.py
│           └── utils/                 # Utility functions
│               ├── __init__.py
│               ├── backlog_performance_test.py
│               ├── cookies.py         # Cookie management
│               ├── helpers.py         # General helper functions
│               ├── meeting_scheduler.py
│               ├── notification_helpers.py
│               ├── oauth.py           # OAuth utilities
│               └── password.py        # Password utilities
├── tests/                            # Test suite
│   ├── __init__.py
│   ├── conftest.py                   # Pytest configuration
│   ├── README.md                     # Testing documentation
│   ├── COMPREHENSIVE_TESTING_IMPROVEMENTS.md
│   └── test_*.py                     # Individual test files
├── alembic/                          # Database migration scripts
│   ├── env.py
│   ├── script.py.mako
│   └── versions/                     # Migration version files
├── scripts/                          # Development and deployment scripts
│   └── start.sh
├── notebooks/                        # Jupyter notebooks for testing
│   └── test_keycloak.ipynb
├── htmlcov/                          # Test coverage reports
├── alembic.ini                       # Alembic configuration
├── Dockerfile                        # Docker container configuration
├── Makefile                          # Build and development commands
├── pyproject.toml                    # Python project configuration
├── run_tests.py                      # Test runner script
├── scrumix.db                        # SQLite database (development)
└── README.md
```

## Quick Start

### Prerequisites

- Python 3.8+
- PostgreSQL (or SQLite for development)
- Redis (optional, for task queue)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ScrumiX/backend
   ```

2. **Create virtual environment**
   ```bash
   conda create -n scrumix python=3.10
   conda activate scrumix
   # or
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -e .
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Initialize database**
   ```bash
   alembic upgrade head
   ```

6. **Run the application**
   ```bash
   uvicorn src.scrumix.main:app --reload
   ```

The API will be available at `http://localhost:8000` with interactive documentation at `http://localhost:8000/docs`.

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src/scrumix --cov-report=html

# Run specific test file
pytest tests/test_users.py

# Run tests with specific markers
pytest -m "not slow"
```

### Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Code Quality

The project follows Python best practices with:
- Type hints throughout the codebase
- Pydantic for data validation
- SQLAlchemy ORM for database operations
- Comprehensive test coverage (target: 80%+)
- PEP 8 style guidelines

## API Documentation

Once the server is running, you can access:
- **Interactive API docs**: `http://localhost:8000/docs`
- **ReDoc documentation**: `http://localhost:8000/redoc`
- **OpenAPI schema**: `http://localhost:8000/openapi.json`

## Configuration

Key configuration options in `.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost/scrumix
# or for SQLite: sqlite:///./scrumix.db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Keycloak (optional)
KEYCLOAK_URL=https://your-keycloak-instance
KEYCLOAK_REALM=your-realm
KEYCLOAK_CLIENT_ID=your-client-id


## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.