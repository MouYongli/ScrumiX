# ScrumiX

**ScrumiX** is an AI-powered Scrum management system designed to enhance agile team productivity and collaboration through intelligent automation and smart assistance with AI agents. 

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-23-blue.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-blue.svg)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Supported-green)](https://hub.docker.com/r/YOUR_DOCKER_IMAGE)

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

[![Forks](https://img.shields.io/github/forks/MouYongli/ScrumiX?style=social)](https://github.com/MouYongli/ScrumiX/network/members)
[![Stars](https://img.shields.io/github/stars/MouYongli/ScrumiX?style=social)](https://github.com/MouYongli/ScrumiX/stargazers)
[![Contributors](https://img.shields.io/github/contributors/MouYongli/ScrumiX)](https://github.com/MouYongli/ScrumiX/graphs/contributors)

[![Issues](https://img.shields.io/github/issues/MouYongli/ScrumiX)](https://github.com/MouYongli/ScrumiX/issues)
[![Last Commit](https://img.shields.io/github/last-commit/MouYongli/ScrumiX)](https://github.com/MouYongli/ScrumiX/commits/main)
[![Pull Requests](https://img.shields.io/github/issues-pr/MouYongli/ScrumiX)](https://github.com/MouYongli/ScrumiX/pulls)
<!-- [![Build Status](https://img.shields.io/github/actions/workflow/status/MouYongli/ScrumiX/ci.yml)](https://github.com/MouYongli/ScrumiX/actions)
[![Code Quality](https://img.shields.io/lgtm/grade/python/g/MouYongli/ScrumiX.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/MouYongli/ScrumiX/context:python) -->

<!-- [![arXiv](https://img.shields.io/badge/arXiv-XXXX.XXXXX-b31b1b.svg)](https://arxiv.org/abs/XXXX.XXXXX)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.xxxxxx.svg)](https://doi.org/10.5281/zenodo.xxxxxx) -->

[![WeChat](https://img.shields.io/badge/WeChat-公众号名称-green)](https://your-wechat-link.com)
[![Weibo](https://img.shields.io/badge/Weibo-关注-red)](https://weibo.com/YOUR_WEIBO_LINK)
[![Discord](https://img.shields.io/discord/YOUR_DISCORD_SERVER_ID?label=Discord&logo=discord&color=5865F2)](https://discord.gg/YOUR_INVITE_LINK)
[![Twitter](https://img.shields.io/twitter/follow/YOUR_TWITTER_HANDLE?style=social)](https://twitter.com/YOUR_TWITTER_HANDLE)


## Components

### Frontend (Next.js 15)
- **Modern React Framework**: Built with Next.js 15, React 19, and TypeScript
- **AI-Powered Interface**: Interactive chat agents and intelligent user experience
- **Real-time Collaboration**: Live updates and team communication features
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Internationalization**: Multi-language support (English/Chinese)
- **Role-Based Dashboards**: Specialized interfaces for different Scrum roles

### Backend (FastAPI)
- **High-Performance API**: FastAPI with async/await support and automatic OpenAPI documentation
- **Database Integration**: SQLAlchemy ORM with PostgreSQL and pgvector for AI embeddings
- **Authentication**: JWT tokens and Keycloak OAuth2/OIDC integration
- **AI Integration**: OpenAI and Google AI model support for intelligent features
- **RESTful Architecture**: Well-structured API endpoints with comprehensive error handling
- **Database Migrations**: Alembic for schema management and version control

### Database Layer
- **PostgreSQL with pgvector**: Primary database for structured data and AI embeddings
  - User management and authentication
  - Project and sprint data
  - Task and backlog management
  - Meeting and documentation storage
  - AI embeddings for semantic search
- **SQLite**: Development and testing database fallback
- **Vector Search**: pgvector extension for AI-powered semantic search and recommendations

### AI Agents System
- **Scrum Master Agent**: Manages Scrum ceremonies, team coordination, and process optimization
- **Product Owner Agent**: Handles product backlog management, user story creation, and prioritization
- **Developer Agent**: Assists with task management, technical implementation, and development workflow
- **Support Agent**: Provides general assistance, troubleshooting, and user guidance

### Authentication & Security
- **Keycloak Integration**: Enterprise-grade identity and access management
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Role-Based Access Control**: Granular permissions for different user roles
- **OAuth2/OIDC Support**: Industry-standard authentication protocols



## Development environment setup




## Installation

### Manual Installation

1. **Setup Database and Services**
   - Install PostgreSQL with pgvector extension and Keycloak via Docker
     ```bash
     # Using individual containers
     docker run -d --name postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=scrumix -e POSTGRES_DB=scrumix_dev pgvector/pgvector:pg16
     docker run -d --name keycloak -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:23.0 start-dev
     ```
   - Or use Docker Compose for easier setup
     ```bash
     cd docker
     docker-compose -f docker-compose.local.yaml up -d
     ```

2. **Install Backend Environment**
   ```bash
   cd backend
   # Create virtual environment
   conda create -n scrumix python=3.10
   conda activate scrumix
   # Or use venv
   # python -m venv venv
   # source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -e .
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your configuration
   
   # Run database migrations
   alembic upgrade head
   ```

3. **Install Frontend Environment**
   ```bash
   cd frontend
   # Install dependencies
   npm install
   
   # Set up environment variables
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run the Application**
   ```bash
   # Start backend (in one terminal)
   cd backend
   uvicorn src.scrumix.main:app --reload --host 0.0.0.0 --port 8000
   
   # Start frontend (in another terminal)
   cd frontend
   npm run dev
   ```
   
   Or use the convenience script:
   ```bash
   ./scripts/start.sh
   ```

5. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Keycloak Admin: http://localhost:8080 (admin/admin)

## Deployment

### Docker-compose

```bash
cd docker
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes



## Project Structure

```
📦 ScrumiX
├── 📁 docs
├── 📁 frontend     
├── 📁 backend
├── 📁 scripts
|   └── start.sh
├── 📁 docker        
│   ├── 📁 frontend
│   ├── 📁 backend
│   ├── ...
│   └── docker-compose.prod.yml
├── Makefile    
├── LICENSE    
└── README.md             
```


## License
This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

## Contributors

This is the official repo by DBIS at RWTH Aachen University ([Yongli Mou*](mou@dbis.rwth-aachen.de), Er Jin, Kevin Ha, Hanbin Chen, Maximilian Kissgen and Stefan Decker). 
---
<!-- ---Developed by **Your Name** | [LinkedIn](https://linkedin.com/in/YOURNAME) | [Twitter](https://twitter.com/YOURHANDLE) -->