# Frontend Makefile for Next.js/Node.js Project
# ================================================

# 变量定义
NODE_VERSION := 18
NPM_CMD := npm
YARN_CMD := yarn
PNPM_CMD := pnpm

# 检测包管理器
PACKAGE_MANAGER := $(shell \
	if [ -f yarn.lock ]; then echo "yarn"; \
	elif [ -f pnpm-lock.yaml ]; then echo "pnpm"; \
	else echo "npm"; fi)

# 根据包管理器设置命令
ifeq ($(PACKAGE_MANAGER),yarn)
	PKG_CMD := $(YARN_CMD)
	INSTALL_CMD := $(YARN_CMD) install
	RUN_CMD := $(YARN_CMD)
else ifeq ($(PACKAGE_MANAGER),pnpm)
	PKG_CMD := $(PNPM_CMD)
	INSTALL_CMD := $(PNPM_CMD) install
	RUN_CMD := $(PNPM_CMD)
else
	PKG_CMD := $(NPM_CMD)
	INSTALL_CMD := $(NPM_CMD) install
	RUN_CMD := $(NPM_CMD) run
endif

# 颜色定义
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# 默认目标
.DEFAULT_GOAL := help

# ===========================================
# 主要命令
# ===========================================

.PHONY: help
help: ## 显示所有可用命令
	@echo "$(BLUE)Available commands:$(RESET)"
	@echo ""
	@echo "$(GREEN)Development:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "dev|start|watch" | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Build & Deploy:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "build|deploy|export" | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Testing:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "test|coverage" | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Code Quality:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "lint|format|check" | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Maintenance:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "install|clean|upgrade|audit" | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Package Manager: $(PACKAGE_MANAGER)$(RESET)"

# ===========================================
# 安装和依赖管理
# ===========================================

.PHONY: install
install: ## 安装依赖
	@echo "$(BLUE)Installing dependencies with $(PACKAGE_MANAGER)...$(RESET)"
	@$(INSTALL_CMD)
	@echo "$(GREEN)Dependencies installed successfully!$(RESET)"

.PHONY: install-dev
install-dev: ## 安装开发依赖
	@echo "$(BLUE)Installing dev dependencies...$(RESET)"
ifeq ($(PACKAGE_MANAGER),yarn)
	@$(YARN_CMD) install --dev
else ifeq ($(PACKAGE_MANAGER),pnpm)
	@$(PNPM_CMD) install --dev
else
	@$(NPM_CMD) install --only=dev
endif
	@echo "$(GREEN)Dev dependencies installed successfully!$(RESET)"

.PHONY: upgrade
upgrade: ## 升级依赖包
	@echo "$(BLUE)Upgrading dependencies...$(RESET)"
ifeq ($(PACKAGE_MANAGER),yarn)
	@$(YARN_CMD) upgrade
else ifeq ($(PACKAGE_MANAGER),pnpm)
	@$(PNPM_CMD) update
else
	@$(NPM_CMD) update
endif
	@echo "$(GREEN)Dependencies upgraded successfully!$(RESET)"

.PHONY: audit
audit: ## 安全审计
	@echo "$(BLUE)Running security audit...$(RESET)"
ifeq ($(PACKAGE_MANAGER),yarn)
	@$(YARN_CMD) audit
else
	@$(NPM_CMD) audit
endif

.PHONY: audit-fix
audit-fix: ## 修复安全问题
	@echo "$(BLUE)Fixing security issues...$(RESET)"
ifeq ($(PACKAGE_MANAGER),yarn)
	@$(YARN_CMD) audit --fix
else
	@$(NPM_CMD) audit fix
endif

# ===========================================
# 开发服务器
# ===========================================

.PHONY: dev
dev: ## 启动开发服务器
	@echo "$(BLUE)Starting development server...$(RESET)"
	@$(RUN_CMD) dev

.PHONY: start
start: ## 启动生产服务器
	@echo "$(BLUE)Starting production server...$(RESET)"
	@$(RUN_CMD) start

.PHONY: dev-turbo
dev-turbo: ## 启动开发服务器（turbo模式）
	@echo "$(BLUE)Starting development server with turbo...$(RESET)"
	@$(RUN_CMD) dev --turbo

# ===========================================
# 构建和部署
# ===========================================

.PHONY: build
build: ## 构建生产版本
	@echo "$(BLUE)Building for production...$(RESET)"
	@$(RUN_CMD) build
	@echo "$(GREEN)Build completed successfully!$(RESET)"

.PHONY: build-analyze
build-analyze: ## 构建并分析bundle大小
	@echo "$(BLUE)Building and analyzing bundle...$(RESET)"
	@ANALYZE=true $(RUN_CMD) build

.PHONY: export
export: build ## 导出静态文件
	@echo "$(BLUE)Exporting static files...$(RESET)"
	@$(RUN_CMD) export
	@echo "$(GREEN)Export completed successfully!$(RESET)"

.PHONY: preview
preview: build ## 预览生产构建
	@echo "$(BLUE)Previewing production build...$(RESET)"
	@$(RUN_CMD) start

# ===========================================
# 测试
# ===========================================

.PHONY: test
test: ## 运行测试
	@echo "$(BLUE)Running tests...$(RESET)"
	@$(RUN_CMD) test

.PHONY: test-watch
test-watch: ## 运行测试（监听模式）
	@echo "$(BLUE)Running tests in watch mode...$(RESET)"
	@$(RUN_CMD) test:watch

.PHONY: test-coverage
test-coverage: ## 运行测试并生成覆盖率报告
	@echo "$(BLUE)Running tests with coverage...$(RESET)"
	@$(RUN_CMD) test:coverage

.PHONY: test-e2e
test-e2e: ## 运行端到端测试
	@echo "$(BLUE)Running E2E tests...$(RESET)"
	@$(RUN_CMD) test:e2e

.PHONY: test-ci
test-ci: ## 运行CI测试
	@echo "$(BLUE)Running CI tests...$(RESET)"
	@$(RUN_CMD) test:ci

# ===========================================
# 代码质量
# ===========================================

.PHONY: lint
lint: ## 代码检查
	@echo "$(BLUE)Running linter...$(RESET)"
	@$(RUN_CMD) lint

.PHONY: lint-fix
lint-fix: ## 修复代码问题
	@echo "$(BLUE)Fixing linting issues...$(RESET)"
	@$(RUN_CMD) lint:fix

.PHONY: format
format: ## 格式化代码
	@echo "$(BLUE)Formatting code...$(RESET)"
	@$(RUN_CMD) format

.PHONY: format-check
format-check: ## 检查代码格式
	@echo "$(BLUE)Checking code format...$(RESET)"
	@$(RUN_CMD) format:check

.PHONY: typecheck
typecheck: ## TypeScript类型检查
	@echo "$(BLUE)Running TypeScript type check...$(RESET)"
	@$(RUN_CMD) type-check

.PHONY: check-all
check-all: lint typecheck test ## 运行所有检查
	@echo "$(GREEN)All checks completed!$(RESET)"

# ===========================================
# 清理
# ===========================================

.PHONY: clean
clean: ## 清理构建文件
	@echo "$(BLUE)Cleaning build files...$(RESET)"
	@rm -rf .next
	@rm -rf out
	@rm -rf dist
	@rm -rf .turbo
	@echo "$(GREEN)Clean completed!$(RESET)"

.PHONY: clean-deps
clean-deps: ## 清理依赖
	@echo "$(BLUE)Cleaning dependencies...$(RESET)"
	@rm -rf node_modules
	@rm -f package-lock.json
	@rm -f yarn.lock
	@rm -f pnpm-lock.yaml
	@echo "$(GREEN)Dependencies cleaned!$(RESET)"

.PHONY: clean-all
clean-all: clean clean-deps ## 清理所有文件
	@echo "$(GREEN)All files cleaned!$(RESET)"

.PHONY: reset
reset: clean-all install ## 重置项目（清理+重新安装）
	@echo "$(GREEN)Project reset completed!$(RESET)"

# ===========================================
# 实用工具
# ===========================================

.PHONY: info
info: ## 显示项目信息
	@echo "$(BLUE)Project Information:$(RESET)"
	@echo "Package Manager: $(PACKAGE_MANAGER)"
	@echo "Node Version: $(shell node --version 2>/dev/null || echo 'Not installed')"
	@echo "NPM Version: $(shell npm --version 2>/dev/null || echo 'Not installed')"
	@echo "Yarn Version: $(shell yarn --version 2>/dev/null || echo 'Not installed')"
	@echo "PNPM Version: $(shell pnpm --version 2>/dev/null || echo 'Not installed')"
	@if [ -f package.json ]; then \
		echo "Project Name: $(shell node -p "require('./package.json').name" 2>/dev/null || echo 'Unknown')"; \
		echo "Project Version: $(shell node -p "require('./package.json').version" 2>/dev/null || echo 'Unknown')"; \
	fi

.PHONY: open
open: ## 在浏览器中打开应用
	@echo "$(BLUE)Opening application in browser...$(RESET)"
	@open http://localhost:3000 || xdg-open http://localhost:3000 || echo "Please open http://localhost:3000 manually"

.PHONY: deps-check
deps-check: ## 检查过时的依赖
	@echo "$(BLUE)Checking for outdated dependencies...$(RESET)"
ifeq ($(PACKAGE_MANAGER),yarn)
	@$(YARN_CMD) outdated
else ifeq ($(PACKAGE_MANAGER),pnpm)
	@$(PNPM_CMD) outdated
else
	@$(NPM_CMD) outdated
endif

.PHONY: size
size: ## 分析包大小
	@echo "$(BLUE)Analyzing bundle size...$(RESET)"
	@$(RUN_CMD) analyze || echo "$(YELLOW)Bundle analyzer not configured$(RESET)"

# ===========================================
# Docker (可选)
# ===========================================

.PHONY: docker-build
docker-build: ## 构建Docker镜像
	@echo "$(BLUE)Building Docker image...$(RESET)"
	@docker build -t scrumix-frontend .

.PHONY: docker-run
docker-run: ## 运行Docker容器
	@echo "$(BLUE)Running Docker container...$(RESET)"
	@docker run -p 3000:3000 scrumix-frontend

.PHONY: docker-dev
docker-dev: ## 运行开发环境Docker
	@echo "$(BLUE)Running development Docker container...$(RESET)"
	@docker-compose up -d

# ===========================================
# Git hooks (可选)
# ===========================================

.PHONY: setup-hooks
setup-hooks: ## 设置Git hooks
	@echo "$(BLUE)Setting up Git hooks...$(RESET)"
	@npx husky install || echo "$(YELLOW)Husky not configured$(RESET)"

# ===========================================
# 环境管理
# ===========================================

.PHONY: check-env
check-env: ## 检查环境变量
	@echo "$(BLUE)Checking environment...$(RESET)"
	@if [ -f .env.local ]; then echo "$(GREEN)✓ .env.local found$(RESET)"; else echo "$(YELLOW)⚠ .env.local not found$(RESET)"; fi
	@if [ -f .env.development ]; then echo "$(GREEN)✓ .env.development found$(RESET)"; else echo "$(YELLOW)⚠ .env.development not found$(RESET)"; fi
	@if [ -f .env.production ]; then echo "$(GREEN)✓ .env.production found$(RESET)"; else echo "$(YELLOW)⚠ .env.production not found$(RESET)"; fi

# ===========================================
# 生产力工具
# ===========================================

.PHONY: generate
generate: ## 生成组件/页面（需要配置代码生成器）
	@echo "$(BLUE)Running code generator...$(RESET)"
	@$(RUN_CMD) generate || echo "$(YELLOW)Code generator not configured$(RESET)"

.PHONY: storybook
storybook: ## 启动Storybook
	@echo "$(BLUE)Starting Storybook...$(RESET)"
	@$(RUN_CMD) storybook || echo "$(YELLOW)Storybook not configured$(RESET)"

.PHONY: build-storybook
build-storybook: ## 构建Storybook
	@echo "$(BLUE)Building Storybook...$(RESET)"
	@$(RUN_CMD) build-storybook || echo "$(YELLOW)Storybook not configured$(RESET)"
