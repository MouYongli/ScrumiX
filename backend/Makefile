# ScrumiX Backend Makefile
# Python项目管理工具

.PHONY: help install install-dev start dev test test-coverage lint format clean build docs migrate db-init db-reset venv check-env

# 默认Python解释器
PYTHON := python3
PIP := pip3
VENV_DIR := venv
SRC_DIR := src
PROJECT_NAME := scrumix

# 颜色定义
RED := \033[31m
GREEN := \033[32m
YELLOW := \033[33m
BLUE := \033[34m
RESET := \033[0m

# 默认目标
help: ## 显示帮助信息
	@echo "$(BLUE)ScrumiX Backend - 可用命令:$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\033[36m%-20s\033[0m %s\n", "命令", "描述"} /^[a-zA-Z_-]+:.*?##/ { printf "\033[36m%-20s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)

##@ 环境管理
venv: ## 创建Python虚拟环境
	@echo "$(YELLOW)创建虚拟环境...$(RESET)"
	$(PYTHON) -m venv $(VENV_DIR)
	@echo "$(GREEN)虚拟环境创建完成！请运行: source $(VENV_DIR)/bin/activate$(RESET)"

install: ## 安装项目依赖
	@echo "$(YELLOW)安装项目依赖...$(RESET)"
	$(PIP) install --upgrade pip
	$(PIP) install -e .
	@echo "$(GREEN)依赖安装完成！$(RESET)"

install-dev: ## 安装开发依赖
	@echo "$(YELLOW)安装开发依赖...$(RESET)"
	$(PIP) install --upgrade pip
	$(PIP) install -e ".[dev]"
	$(PIP) install pytest pytest-cov black flake8 isort mypy pre-commit
	@echo "$(GREEN)开发依赖安装完成！$(RESET)"

check-env: ## 检查环境变量
	@echo "$(YELLOW)检查环境变量...$(RESET)"
	@python3 -c "import os; print('POSTGRES_SERVER:', os.getenv('POSTGRES_SERVER', 'Not set')); print('POSTGRES_PASSWORD:', '***' if os.getenv('POSTGRES_PASSWORD') else 'Not set')"

##@ 开发工具
start: ## 启动应用
	@echo "$(YELLOW)启动ScrumiX应用...$(RESET)"
	cd $(SRC_DIR) && $(PYTHON) -m $(PROJECT_NAME).main

dev: ## 开发模式启动（带热重载）
	@echo "$(YELLOW)开发模式启动...$(RESET)"
	cd $(SRC_DIR) && $(PYTHON) -c "import uvicorn; uvicorn.run('$(PROJECT_NAME).api.app:app', host='0.0.0.0', port=8000, reload=True)"

##@ 代码质量
lint: ## 代码检查
	@echo "$(YELLOW)运行代码检查...$(RESET)"
	flake8 $(SRC_DIR)
	mypy $(SRC_DIR) --ignore-missing-imports

format: ## 格式化代码
	@echo "$(YELLOW)格式化代码...$(RESET)"
	black $(SRC_DIR)
	isort $(SRC_DIR)
	@echo "$(GREEN)代码格式化完成！$(RESET)"

format-check: ## 检查代码格式
	@echo "$(YELLOW)检查代码格式...$(RESET)"
	black --check $(SRC_DIR)
	isort --check-only $(SRC_DIR)

##@ 测试
test: ## 运行测试
	@echo "$(YELLOW)运行测试...$(RESET)"
	pytest tests/ -v

test-coverage: ## 运行测试并生成覆盖率报告
	@echo "$(YELLOW)运行测试覆盖率...$(RESET)"
	pytest tests/ --cov=$(SRC_DIR)/$(PROJECT_NAME) --cov-report=html --cov-report=term

test-watch: ## 监控文件变化并自动运行测试
	@echo "$(YELLOW)监控测试模式...$(RESET)"
	pytest-watch tests/

##@ 数据库
db-init: ## 初始化数据库
	@echo "$(YELLOW)初始化数据库...$(RESET)"
	cd $(SRC_DIR) && $(PYTHON) -c "from $(PROJECT_NAME).api.core.init_db import init_db; init_db()"
	@echo "$(GREEN)数据库初始化完成！$(RESET)"

migrate: ## 运行数据库迁移
	@echo "$(YELLOW)运行数据库迁移...$(RESET)"
	alembic upgrade head
	@echo "$(GREEN)数据库迁移完成！$(RESET)"

migrate-create: ## 创建新的迁移文件
	@read -p "请输入迁移描述: " desc; \
	alembic revision --autogenerate -m "$$desc"

db-reset: ## 重置数据库（危险操作！）
	@echo "$(RED)警告：这将删除所有数据！$(RESET)"
	@read -p "确认继续？(yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		alembic downgrade base; \
		alembic upgrade head; \
		echo "$(GREEN)数据库重置完成！$(RESET)"; \
	else \
		echo "$(YELLOW)操作已取消$(RESET)"; \
	fi

##@ 构建和部署
build: ## 构建项目
	@echo "$(YELLOW)构建项目...$(RESET)"
	$(PYTHON) -m build
	@echo "$(GREEN)构建完成！$(RESET)"

clean: ## 清理缓存和临时文件
	@echo "$(YELLOW)清理临时文件...$(RESET)"
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type f -name ".coverage" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	rm -rf build/ dist/ .pytest_cache/ htmlcov/ .coverage.*
	@echo "$(GREEN)清理完成！$(RESET)"

##@ 文档
docs: ## 生成API文档
	@echo "$(YELLOW)生成API文档...$(RESET)"
	cd $(SRC_DIR) && $(PYTHON) -c "import uvicorn; print('API文档将在 http://localhost:8000/docs 访问')"

##@ 工具
shell: ## 启动Python交互式shell
	@echo "$(YELLOW)启动Python shell...$(RESET)"
	cd $(SRC_DIR) && $(PYTHON) -i -c "from $(PROJECT_NAME).api.app import app; print('应用已加载，可以使用 app 变量')"

deps-update: ## 更新依赖包
	@echo "$(YELLOW)更新依赖包...$(RESET)"
	$(PIP) list --outdated
	@echo "$(BLUE)提示：使用 'pip install --upgrade 包名' 更新特定包$(RESET)"

deps-check: ## 检查依赖安全漏洞
	@echo "$(YELLOW)检查依赖安全漏洞...$(RESET)"
	$(PIP) install safety
	safety check

##@ Git钩子
pre-commit-install: ## 安装pre-commit钩子
	@echo "$(YELLOW)安装pre-commit钩子...$(RESET)"
	pre-commit install
	@echo "$(GREEN)pre-commit钩子安装完成！$(RESET)"

pre-commit-run: ## 运行pre-commit检查
	@echo "$(YELLOW)运行pre-commit检查...$(RESET)"
	pre-commit run --all-files

##@ 一键操作
setup: venv install-dev pre-commit-install ## 完整环境设置（创建虚拟环境+安装依赖+配置钩子）
	@echo "$(GREEN)环境设置完成！请运行: source $(VENV_DIR)/bin/activate$(RESET)"

ci: format-check lint test ## CI检查（格式+检查+测试）
	@echo "$(GREEN)CI检查通过！$(RESET)"

all: clean install test build ## 完整构建流程
