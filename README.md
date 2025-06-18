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
- Frontend (Next.js): The user interface is built with Next.js. The frontend communicates with the backend (FastAPI) to handle the logic and AI operations.

- Backend (FastAPI): The backend is built with FastAPI, handling API requests, interacting with databases, running AI workflows and agents, and serving the AI-generated Scrum management and development suggestions to the frontend.
  
- Databases:
  - SQL Database (e.g., PostgreSQL, MySQL, SQLite, etc.) is used to store and manage structured system data (e.g., user information, project information, etc.)
  - Vector Database (e.g., Weaviate, FAISS or similar) is used to store and manage unstructured user and system data (e.g., user feedback, project documents, etc.)
  - S3 Object Storage (e.g., AWS S3, MinIO, etc.) is used to store and manage unstructured user and system data (e.g., user feedback, project documents, etc.)

- AI Agents:
  - Scrum Master Agent: The Scrum Master Agent is responsible for managing the Scrum process, including the Scrum meetings, the Scrum board, and the Scrum artifacts.
  - Product Owner Agent: The Product Owner Agent is responsible for managing the product backlog, including the product backlog items, the product backlog items' status, and the product backlog items' priority.
  - Developer Agent: The Developer Agent is responsible for managing the development process, including the development tasks, the development tasks' status, and the development tasks' priority.
  - QA Agent: The QA Agent is responsible for managing the QA process, including the QA tasks, the QA tasks' status, and the QA tasks' priority.



## Development environment setup




## Installation

### Manual installation

1. Setup databases
  - Install PostgreSQL, Weaviate and Redis via Docker
    ```bash
    docker run -it --name postgres -p 5432:5432 -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=scrumix postgres
    docker run -it --name weaviate -p 8080:8080 -e WEAVIATE_AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true -e WEAVIATE_ENABLE_MODULES=all weaviate/weaviate:1.25.0
    docker run -it --name redis -p 6379:6379 redis
    ```
    or here with docker-compose
    ```bash
    cd docker
    docker-compose -f docker-compose.local.yml up -d
    ```

2. Install frontend and backend environment

  - Install backend environment
    ```bash
    cd backend
    conda create -n scrumix python=3.10
    conda activate scrumix
    pip install -e .
    ```

  - Install frontend environment
    ```bash
    cd frontend
    npm install
    ```

3. Run the application
    ```bash
    cd backend
    uvicorn src.main:app --reload
    ```
    ```bash
    cd frontend
    npm run dev
    ```
    or

    ```bash
    ./start.sh
    ```

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
