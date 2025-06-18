# ADES - AI 开发经验系统

> **GAIT 不是 gait 而是 GIT 中有 AI**

[![Go 版本](https://img.shields.io/badge/Go-1.22+-blue.svg)](https://golang.org)
[![许可证](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](Dockerfile)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-blue.svg)](deployments/kubernetes/)

## 🚀 概述

**ADES（AI Development Experience System）** 是一个创新性的 AI 驱动平台，它改变了开发者与代码库交互的方式。通过结合先进的机器学习、语义分析和智能自动化，ADES 为开发模式、代码质量和团队协作提供了前所未有的智能开发体验。

### 🎯 ADES 的特色

- **🧠 AI 驱动分析**：先进的机器学习算法分析整个代码库，提取模式、检测异常并预测趋势
- **🔍 语义理解**：对提交、代码变更和开发意图进行深度语义分析
- **🤝 实时协作**：具有在线状态跟踪和共享分析的实时协作功能
- **🎨 交互式可视化**：丰富的仪表板和图表，展示代码指标、团队活动和质量趋势
- **🔌 IDE 集成**：与流行 IDE 无缝集成，提供实时代码辅助
- **📊 全面分析**：深入洞察代码质量、技术债务和团队生产力
- **🚀 生产就绪**：企业级部署，支持 Docker、Kubernetes 和 CI/CD 流水线

## 📋 目录

- [功能特性](#-功能特性)
- [系统架构](#-系统架构)
- [快速开始](#-快速开始)
- [安装部署](#-安装部署)
- [配置说明](#-配置说明)
- [API 文档](#-api-文档)
- [IDE 集成](#-ide-集成)
- [生产部署](#-生产部署)
- [参与贡献](#-参与贡献)
- [开源许可](#-开源许可)

## ✨ 功能特性

### 🧠 核心 AI 能力

#### **语义分析引擎**
- **意图分类**：自动按开发意图对提交进行分类（功能、修复、重构等）
- **主题建模**：从代码变更中提取关键主题和概念
- **相似性匹配**：在代码库中查找相似的实现和模式
- **上下文理解**：深度理解代码上下文和关系

#### **机器学习流水线**
- **模式识别**：识别可重用的代码模式和设计模式
- **异常检测**：检测异常代码变更、潜在错误和安全问题
- **趋势预测**：预测开发趋势、技术债务和质量指标
- **质量评估**：自动化代码质量评分和改进建议

#### **知识图谱系统**
- **关系映射**：映射代码组件、开发者和概念之间的关系
- **知识发现**：发现隐藏的连接和依赖关系
- **图查询**：复杂代码关系的高级查询功能
- **洞察生成**：从代码关系中生成可操作的洞察

### 🔧 开发工具

#### **自动化代码审查**
- **多维度分析**：质量、安全、性能和模式分析
- **智能建议**：基于机器学习的代码改进建议
- **严重性分类**：自动优先级排序问题和建议
- **集成就绪**：与现有 CI/CD 流水线协同工作

#### **IDE 集成**
- **实时分析**：在您输入时进行实时代码分析
- **智能补全**：具有上下文感知的 AI 驱动代码补全
- **内联提示**：直接在编辑器中显示智能建议和警告
- **多 IDE 支持**：VSCode、IntelliJ IDEA、Vim、Emacs、Sublime Text

#### **协作功能**
- **实时在线状态**：实时查看谁在做什么
- **共享分析**：协作进行代码分析和洞察
- **团队洞察**：团队生产力和协作指标
- **知识共享**：在团队中分享模式和洞察

### 📊 分析与可视化

#### **交互式仪表板**
- **14+ 组件类型**：图表、表格、指标、仪表、热图等
- **实时更新**：通过 WebSocket 连接进行实时数据更新
- **可定制布局**：拖拽式仪表板创建
- **导出功能**：导出仪表板为 PNG、PDF、CSV 或 JSON

#### **全面指标**
- **代码质量趋势**：跟踪质量改进随时间的变化
- **团队活动**：开发者生产力和贡献分析
- **技术债务**：识别和跟踪技术债务积累
- **性能洞察**：代码性能和优化机会

### 🔌 集成生态系统

#### **MCP（模型上下文协议）支持**
- **AI 助手集成**：与 Claude、ChatGPT 和其他 AI 助手协同工作
- **6 个专业工具**：搜索经验、提取模式、分析语义
- **上下文提供**：为 AI 驱动的开发辅助提供丰富上下文
- **WebSocket 和 HTTP**：灵活的通信协议

#### **API 优先设计**
- **RESTful API**：20+ 个端点覆盖所有 ADES 功能
- **GraphQL 支持**：高级查询功能
- **Webhook 集成**：实时通知和集成
- **速率限制**：企业级 API 保护

## 🏗 系统架构

ADES 采用模块化、微服务启发的架构，专为可扩展性和可维护性而设计：

```
                        ADES 系统架构
    ═══════════════════════════════════════════════════════

    客户端层
    ┌─────────────────────────────────────────────────────┐
    │  Web UI  │  IDE 插件  │  移动应用  │  API 客户端  │    
    └─────────────────────────────────────────────────────┘

    API 网关
    ┌─────────────────────────────────────────────────────┐
    │                   统一接入点                         
    └─────────────────────────────────────────────────────┘

    核心服务层
    ┌─────────────────────────────────────────────────────┐
    │  语义分析  │  ML引擎  │  知识图谱  │  MCP服务器  │
    └─────────────────────────────────────────────────────┘

    集成服务层
    ┌─────────────────────────────────────────────────────┐
    │  Git集成  │  IDE集成  │  协作服务  │  可视化面板  │
    └─────────────────────────────────────────────────────┘

    数据存储层
    ┌─────────────────────────────────────────────────────┐
    │ SQLite数据库 │ 向量数据库 │ Redis缓存 │ 文件存储 │
    └─────────────────────────────────────────────────────┘
```

### 核心组件

- **语义分析引擎**：处理代码语义和意图
- **机器学习流水线**：模式识别、异常检测、趋势预测
- **知识图谱**：关系映射和洞察生成
- **MCP 服务器**：AI 助手集成和上下文提供
- **IDE 集成**：实时编辑器集成和辅助
- **协作服务器**：实时团队协作功能
- **可视化仪表板**：交互式图表和分析

## 🚀 快速开始

### 前置要求

- **Go 1.22+**
- **Git**
- **Docker**（可选，用于容器化部署）
- **Node.js 18+**（用于 Web UI 开发）

### 1. 克隆和构建

```bash
# 克隆仓库
git clone https://github.com/knoxai/gait.git
cd gait

# 构建应用程序
go build -o ades .

# 运行 ADES
./ades -port 8080
```

### 2. 访问 ADES

在浏览器中打开以下地址：

- **主界面**：http://localhost:8080
- **IDE 集成**：http://localhost:8081
- **协作功能**：http://localhost:8082
- **可视化**：http://localhost:8083
- **API 文档**：http://localhost:8080/api/docs
- **监控指标**：http://localhost:8080/metrics

### 3. 分析您的第一个仓库

```bash
# 使用您的仓库初始化 ADES
curl -X POST "http://localhost:8080/api/repositories" \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/your/repo", "name": "my-project"}'

# 开始全面分析
curl -X POST "http://localhost:8080/api/ades/analyze/comprehensive" \
  -H "Content-Type: application/json" \
  -d '{"async": false}'
```

## 📦 安装部署

### 选项 1：二进制安装

```bash
# 下载最新版本
wget https://github.com/knoxai/gait/releases/latest/download/ades-linux-amd64.tar.gz

# 解压并安装
tar -xzf ades-linux-amd64.tar.gz
sudo mv ades /usr/local/bin/

# 验证安装
ades --version
```

### 选项 2：Docker 安装

```bash
# 拉取 Docker 镜像
docker pull ghcr.io/knoxai/ades:latest

# 使用 Docker 运行
docker run -d \
  --name ades \
  -p 8080:8080 \
  -p 8081:8081 \
  -p 8082:8082 \
  -p 8083:8083 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/repositories:/app/repositories:ro \
  ghcr.io/knoxai/ades:latest
```

### 选项 3：Docker Compose（推荐用于开发）

```bash
# 克隆仓库
git clone https://github.com/knoxai/gait.git
cd gait

# 启动所有服务
docker-compose up -d

# 服务将在以下地址可用：
# - ADES: http://localhost:8080
# - Redis: localhost:6379
# - PostgreSQL: localhost:5432
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3000
```

### 选项 4：Kubernetes 部署

```bash
# 部署到 Kubernetes
kubectl apply -f deployments/kubernetes/

# 或使用自动化部署脚本
./deployments/scripts/deploy.sh
```

## ⚙️ 配置说明

ADES 使用位于 `data/ades-config.json` 的 JSON 配置文件。以下是示例配置：

```json
{
  "server": {
    "port": 8080,
    "host": "0.0.0.0"
  },
  "semantic": {
    "enabled": true,
    "embedding_dimension": 384,
    "similarity_threshold": 0.7
  },
  "ml": {
    "enabled": true,
    "pattern_recognition_engine": "advanced",
    "classification_threshold": 0.7,
    "anomaly_detection_enabled": true,
    "trend_prediction_enabled": true
  },
  "ide_integration": {
    "enabled": true,
    "port": 8081,
    "supported_ides": ["vscode", "intellij", "vim", "emacs", "sublime"],
    "enable_real_time_analysis": true,
    "enable_code_completion": true
  },
  "collaboration": {
    "enabled": true,
    "websocket_port": 8082,
    "max_concurrent_users": 50,
    "enable_shared_analysis": true
  },
  "visualization": {
    "enabled": true,
    "dashboard_port": 8083,
    "enable_real_time_charts": true,
    "chart_types": ["line", "bar", "pie", "scatter", "heatmap", "network"]
  }
}
```

### 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `ADES_PORT` | 主应用程序端口 | `8080` |
| `ADES_DATA_DIR` | 数据目录路径 | `./data` |
| `ADES_CONFIG_PATH` | 配置文件路径 | `./data/ades-config.json` |
| `ADES_LOG_LEVEL` | 日志级别 | `info` |
| `ADES_ENABLE_METRICS` | 启用指标收集 | `true` |

## 📚 API 文档

ADES 提供包含 20+ 个端点的全面 RESTful API：

### 核心端点

```bash
# 仓库管理
GET    /api/repositories          # 列出仓库
POST   /api/repositories          # 添加仓库
GET    /api/repositories/{id}     # 获取仓库详情

# 分析功能
POST   /api/ades/analyze/comprehensive  # 全面分析
GET    /api/ades/analyze/progress       # 分析进度
GET    /api/commits                     # 列出提交
GET    /api/commits/{hash}              # 获取提交详情

# 语义分析
POST   /api/semantic/analyze      # 分析语义
GET    /api/semantic/similar      # 查找相似提交
POST   /api/semantic/search       # 语义搜索

# 机器学习
GET    /api/ml/patterns           # 获取检测到的模式
GET    /api/ml/anomalies          # 获取异常
GET    /api/ml/trends             # 获取趋势预测

# 知识图谱
GET    /api/knowledge/nodes       # 获取图节点
GET    /api/knowledge/relationships  # 获取关系
POST   /api/knowledge/query       # 查询知识图谱
```

### MCP 工具

ADES 为 AI 助手集成提供 6 个专业 MCP 工具：

1. **search_development_experience** - 搜索相似的开发经验
2. **get_similar_implementations** - 通过提交查找相似实现
3. **extract_reusable_patterns** - 提取可重用代码模式
4. **analyze_commit_semantics** - 提交的详细语义分析
5. **query_knowledge_graph** - 查询开发知识图谱
6. **get_development_insights** - 全面的开发洞察

## 🔌 IDE 集成

### Visual Studio Code

```bash
# 安装 ADES 扩展（即将推出）
code --install-extension ades.ades-vscode

# 或从 .vsix 文件手动安装
code --install-extension ades-vscode-1.0.0.vsix
```

### IntelliJ IDEA

```bash
# 从 JetBrains 市场安装（即将推出）
# 或从 .jar 文件手动安装
```

### Vim/Neovim

```vim
" 添加到您的 .vimrc 或 init.vim
Plug 'knoxai/ades-vim'
```

### 配置

所有 IDE 插件连接到运行在端口 8081 的 ADES 服务器：

```json
{
  "ades.server.url": "http://localhost:8081",
  "ades.realtime.enabled": true,
  "ades.completion.enabled": true,
  "ades.hints.enabled": true
}
```

## 🚀 生产部署

### 使用 Kubernetes 进行生产部署

```bash
# 1. 构建并推送 Docker 镜像
docker build -t your-registry/ades:latest .
docker push your-registry/ades:latest

# 2. 更新部署配置
sed -i 's|image: ades:latest|image: your-registry/ades:latest|g' deployments/kubernetes/deployment.yaml

# 3. 部署到 Kubernetes
kubectl apply -f deployments/kubernetes/

# 4. 验证部署
kubectl get pods -n ades-system
kubectl get services -n ades-system
```

### 扩展配置

```yaml
# 水平 Pod 自动扩展器
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ades-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ades-deployment
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### 监控和可观测性

ADES 包含全面的监控功能：

- **Prometheus 指标**：在 `/metrics` 端点可用
- **健康检查**：在 `/api/health` 端点可用
- **结构化日志**：JSON 格式，可配置级别
- **性能指标**：响应时间、吞吐量、错误率
- **业务指标**：分析计数、用户活动、系统使用情况

## 🧪 开发

### 设置开发环境

```bash
# 克隆仓库
git clone https://github.com/knoxai/gait.git
cd gait

# 安装依赖
go mod download

# 运行测试
go test ./...

# 使用热重载运行（需要 air）
go install github.com/cosmtrek/air@latest
air

# 开发构建
go build -o ades-dev .
./ades-dev -port 8080
```

### 项目结构

```
gait/
├── cmd/                    # 命令行接口
├── internal/               # 内部包
│   ├── ades/              # 核心 ADES 功能
│   │   ├── analyzer/      # 代码分析
│   │   ├── batch/         # 批处理
│   │   ├── collaboration/ # 实时协作
│   │   ├── config/        # 配置管理
│   │   ├── ide/           # IDE 集成
│   │   ├── knowledge/     # 知识图谱
│   │   ├── mcp/           # MCP 服务器
│   │   ├── ml/            # 机器学习
│   │   ├── models/        # 数据模型
│   │   ├── monitoring/    # 监控和指标
│   │   ├── patterns/      # 模式提取
│   │   ├── performance/   # 性能优化
│   │   ├── review/        # 代码审查
│   │   ├── security/      # 安全功能
│   │   ├── semantic/      # 语义分析
│   │   ├── storage/       # 数据存储
│   │   ├── vector/        # 向量操作
│   │   └── visualization/ # 仪表板和图表
│   ├── api/               # API 处理器
│   ├── git/               # Git 集成
│   └── web/               # Web 界面
├── pkg/                   # 公共包
├── deployments/           # 部署配置
│   ├── kubernetes/        # Kubernetes 清单
│   ├── scripts/           # 部署脚本
│   └── docker/            # Docker 配置
├── static/                # 静态 Web 资源
├── templates/             # HTML 模板
└── docs/                  # 文档
```

### 运行测试

```bash
# 运行所有测试
go test ./...

# 运行带覆盖率的测试
go test -cover ./...

# 运行特定测试包
go test ./internal/ades/semantic/

# 运行集成测试
go test -tags=integration ./...

# 基准测试
go test -bench=. ./...
```

## 🤝 参与贡献

我们欢迎对 ADES 的贡献！请查看我们的[贡献指南](CONTRIBUTING.md)了解详情。

### 开发工作流

1. **Fork** 仓库
2. **创建** 功能分支 (`git checkout -b feature/amazing-feature`)
3. **提交** 您的更改 (`git commit -m 'Add amazing feature'`)
4. **推送** 到分支 (`git push origin feature/amazing-feature`)
5. **打开** Pull Request

### 代码标准

- **Go**：遵循标准 Go 约定并使用 `gofmt`
- **测试**：保持 >80% 的测试覆盖率
- **文档**：为所有公共 API 编写文档
- **提交**：使用约定式提交消息

## 📄 开源许可

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- **Go 社区** 提供的优秀生态系统
- **ChromaDB** 提供的向量数据库功能
- **Prometheus** 提供的监控和指标
- **Kubernetes** 提供的编排平台
- **所有贡献者** 帮助构建 ADES

## 📞 支持

- **文档**：[docs.knox.chat](https://docs.knox.chat)
- **问题反馈**：[GitHub Issues](https://github.com/knoxai/gait/issues)
- **讨论**：[GitHub Discussions](https://github.com/knoxai/gait/discussions)
- **邮箱**：support@knox.chat

---

**ADES - 用 AI 改变开发经验** 🚀