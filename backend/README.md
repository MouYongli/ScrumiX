# ScrumiX Backend

## Project Structure
```
backend/
├── src/
│   └── scrumix/
│       ├── __init__.py
│       ├── main.py               # FastAPI 应用实例
│       ├── api/                  # API 启动相关
│       │   ├── __init__.py
│       │   ├── app.py
│       │   ├── db/                   # 数据库相关
│       │   │   ├── __init__.py
│       │   │   ├── base.py           # SQLAlchemy Base 基类
│       │   │   ├── database.py       # 数据库连接和初始化
│       │   │   └── session.py        # Session 管理
│       │   ├── core/                 # 核心配置与扩展
│       │   │   ├── __init__.py
│       │   │   ├── config.py         # 全局配置
│       │   │   └── security.py       # 安全相关，如认证加密
│       │   ├── routers/              # API 路由分发
│       │   │   ├── __init__.py
│       │   │   ├── users.py          # 用户路由
│       │   │   └── xxx.py          # 项目/物品路由
│       │   ├── models/               # SQLAlchemy ORM 数据模型
│       │   │   ├── __init__.py
│       │   │   ├── user.py           # 用户模型
│       │   │   └── xxx.py
│       │   ├── schemas/              # Pydantic 数据验证模型
│       │   │   ├── __init__.py
│       │   │   ├── user.py
│       │   │   └── xxx.py
│       │   ├── crud/                 # CRUD 封装
│       │   │   ├── __init__.py
│       │   │   ├── base.py
│       │   │   ├── crud_user.py
│       │   │   └── crud_xxx.py
│       │   └── utils/                # 工具函数
│       │       ├── __init__.py
│       │       ├── helpers.py        # 通用函数
│       │       └── logger.py         # 日志
│       ├── agents/                 # 代理相关
│       │   ├── __init__.py
│       │   ├── agent/                # 代理基类
│       │   │   ├── __init__.py
│       │   │   ├── agent.py          # 代理基类
│       │   │   └── agent_template.py # 代理模板
│       │   ├── llm/                  # LLM 相关
│       │   │   ├── __init__.py
│       │   │   ├── base.py       # LLM 基类
│       │   │   └── openai.py       # OpenAI 实现
│       │   │   ├── anthropic.py    # Anthropic 实现
│       │   │   ├── deepseek.py     # DeepSeek 实现
│       │   │   └── gemini.py       # Gemini 实现
│       │   ├── tools/               # 代理相关
│       │   │   ├── __init__.py
│       │   │   ├── email.py          # 邮件工具
│       │   │   ├── file.py           # 文件工具
│       │   │   ├── image.py          # 图片工具
│       │   │   ├── pdf.py            # PDF 工具
│       │   │   ├── text.py           # 文本工具
│       │   │   └── web.py            # 网页工具
│       │   ├── memory/               # 记忆相关
│       │   │   ├── __init__.py
│       │   │   ├── memory.py         # 记忆基类
│       │   │   ├── long_memory.py    # 长时记忆
│       │   │   └── short_memory.py   # 短时记忆
│       │   ├── prompts/              # 提示词相关
│       │   │   ├── __init__.py
│       │   │   ├── prompt.py         # 提示词基类
│       │   │   └── prompt_template.py # 提示词模板
│       │   ├── tasks/                # 任务相关
│       │   │   ├── __init__.py
│       │   │   ├── task.py           # 任务基类
│       │   │   └── task_template.py  # 任务模板
│       │   ├── workflows/            # 工作流相关
│       │   │   ├── __init__.py
│       │   │   ├── workflow.py       # 工作流基类
│       │   │   ├── workflow_manager.py   # 工作流管理器
│       │   │   └── workflow_template.py # 工作流模板
│       │   ├── plan/                 # 计划相关
│       │   │   ├── __init__.py
│       │   │   ├── plan.py           # 计划基类
│       │   │   └── plan_manager.py   # 计划管理器
│       │   │   └── plan_template.py  # 计划模板
│       │   └── utils/                # 工具函数
│       │       ├── __init__.py
│       │       ├── helpers.py        # 通用函数
│       │       └── logger.py         # 日志
|       ├──
├── tests/                        # 测试
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_api/
│   └── test_crud/
├── scripts/                      # 开发/部署脚本
├── docker/                       # Docker 配置
├── docs/                         # 项目文档
├── alembic/                      # Alembic 数据库迁移脚本
├── .env                          # 环境变量配置
├── .gitignore
├── requirements.txt              # Python 依赖
└── README.md
```