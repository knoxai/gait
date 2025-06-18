# ADES - AI开发经验系统

## 🎯 概述

ADES (AI开发经验系统) 是GAIT的创新扩展，将Git代码库转化为智能知识库。它分析提交历史以提取开发经验、模式和可重用组件，为AI助手提供有上下文的项目特定智能。

## ✨ 功能特性

### 🔍 智能提交分析
- **自动分类**：按类型分类提交（功能、修复、重构等）
- **范围检测**：识别变更是否影响前端、后端、数据库等
- **影响评估**：评估变更的大小（主要、次要、补丁）
- **技术提取**：自动检测提交中使用的技术

### 🧩 模式识别
- **代码模式检测**：识别重复的代码结构和设计模式
- **组件提取**：查找可重用的UI组件、工具函数和服务
- **架构分析**：检测架构模式和最佳实践
- **依赖映射**：跟踪组件和模块之间的关系

### 📚 经验数据库
- **可搜索知识库**：跨开发经验的全文搜索
- **分类存储**：按类型、技术和可重用性评分组织
- **置信度评分**：AI生成的每个经验的置信度
- **使用跟踪**：监控哪些经验最有价值

### 🔗 AI集成就绪
- **MCP协议支持**：准备与Claude等AI助手集成
- **上下文查询**：为AI响应提供相关历史上下文
- **相似实现搜索**：从过往工作中查找相关解决方案
- **基于模式的建议**：根据项目历史推荐代码模式

## 🚀 快速开始

### 先决条件
- Go 1.21或更高版本
- SQLite3
- 待分析的Git代码库

### 安装

1. **克隆并构建带ADES的GAIT**：
```bash
git clone <your-gait-repo>
cd gait
go mod tidy
go build
```

2. **启用ADES运行GAIT**：
```bash
./gait --repo /path/to/your/git/repo --port 8080
```

3. **访问Web界面**：
```
http://localhost:8080
```

### 首次设置

当您第一次运行带ADES的GAIT时，它会：
1. 在您的代码库中创建`.gait/ades.db` SQLite数据库
2. 初始化数据库架构
3. 准备按需分析提交

## 📖 使用方法

### API端点

#### 🔍 搜索开发经验
```bash
# 搜索包含"authentication"的经验
GET /api/ades/experiences/search?q=authentication&limit=10

# 按类别搜索 (0=UI组件, 1=后端逻辑, 等等)
GET /api/ades/experiences/search?category=1&limit=5

# 按技术搜索
GET /api/ades/experiences/search?language=javascript&limit=10
```

#### 🧩 查找相似实现
```bash
# 查找相似代码实现
POST /api/ades/similar
Content-Type: application/json

{
  "code_snippet": "function authenticate(token) { ... }",
  "context": "用户认证"
}
```

#### 🔧 提取可重用模式
```bash
# 获取所有React组件模式
GET /api/ades/patterns?type=react_component

# 获取特定提交的模式
GET /api/ades/patterns?commit_hash=abc123&type=http_handler
```

#### 📊 代码库分析
```bash
# 触发完整代码库分析（后台运行）
POST /api/ades/analyze

# 运行增量分析（仅新提交）
POST /api/ades/analyze/incremental

# 获取分析数据
GET /api/ades/analytics
```

#### 📈 获取洞察
```bash
# 获取最近经验
GET /api/ades/experiences/recent?limit=10

# 获取高置信度经验
GET /api/ades/experiences/high-confidence?min_confidence=0.8

# 获取当前工作流上下文
GET /api/ades/context
```

### 程序化使用

```go
package main

import (
    "github.com/knoxai/gait/internal/ades"
    "github.com/knoxai/gait/internal/git"
)

func main() {
    // 初始化Git服务
    gitService := git.NewService("/path/to/repo")
    
    // 初始化ADES
    adesService, err := ades.NewService(gitService)
    if err != nil {
        panic(err)
    }
    defer adesService.Close()
    
    // 分析代码库
    err = adesService.AnalyzeRepository()
    if err != nil {
        panic(err)
    }
    
    // 搜索经验
    query := models.SearchQuery{
        Query: "authentication",
        Limit: 10,
    }
    
    results, err := adesService.SearchExperiences(query)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("找到 %d 个经验\n", len(results.Experiences))
}
```

## 🏗️ 架构

### 核心组件

```
ADES架构
├── 📊 分析器
│   ├── 提交分析器 - 分析单个提交
│   └── 模式检测器 - 检测代码模式和组件
├── 💾 存储
│   ├── 数据库 - SQLite数据库管理
│   ├── 仓库 - 数据访问层
│   └── 迁移 - 数据库架构管理
├── 🔧 模型
│   ├── 类型 - 核心数据结构
│   ├── 分类 - 提交分类
│   └── 经验 - 开发经验条目
└── 🌐 API
    ├── 处理器 - HTTP请求处理器
    └── 集成 - GAIT集成层
```

### 数据流

1. **提交分析**：分析Git提交的类型、范围和影响
2. **模式检测**：识别代码模式和可重用组件
3. **经验提取**：创建并存储开发经验
4. **索引**：维护全文搜索索引
5. **API访问**：RESTful API提供对分析数据的访问

## 🎯 使用场景

### 对于个人开发者

**场景**：您需要实现用户认证但不记得之前是如何做的。

```bash
# 搜索认证经验
curl "http://localhost:8080/api/ades/experiences/search?q=authentication"

# 获取相似实现
curl -X POST http://localhost:8080/api/ades/similar \
  -H "Content-Type: application/json" \
  -d '{"context": "用户认证", "code_snippet": "登录函数"}'
```

### 对于AI助手

**场景**：AI助手需要了解团队通常如何实现API端点的上下文。

```bash
# 获取API处理器模式
curl "http://localhost:8080/api/ades/patterns?type=api_handler"

# 获取最近的后端经验
curl "http://localhost:8080/api/ades/experiences/search?category=1&limit=5"
```

### 对于团队知识分享

**场景**：新团队成员想要了解项目模式和最佳实践。

```bash
# 获取高置信度经验（经验证的模式）
curl "http://localhost:8080/api/ades/experiences/high-confidence?min_confidence=0.9"

# 获取分析概览
curl "http://localhost:8080/api/ades/analytics"
```

## 🔧 配置

### 数据库位置
ADES在您的代码库根目录的`.gait/ades.db`创建数据库。这将分析数据与您的项目保持在一起。

### 分析范围
默认情况下，ADES分析：
- 初始运行时的最近100次提交
- 增量分析时的新提交
- 所有文件类型（带二进制文件过滤）

### 模式检测
ADES识别以下模式：
- **Go**：HTTP处理器、结构体、接口、错误处理
- **JavaScript/TypeScript**：React组件、async/await、Express路由
- **SQL**：查询和数据库操作
- **Docker**：配置模式
- **REST API**：端点模式

## 📊 分析和洞察

ADES提供关于您开发模式的丰富分析：

- **提交分类分布**：查看哪些类型的变更最常见
- **技术使用**：跟踪哪些技术使用最频繁
- **模式频率**：识别最常见的代码模式
- **可重用性评分**：找到最可重用的组件和模式
- **开发趋势**：了解您的代码库如何演进

## 🔮 未来增强

### 冲刺2：智能引擎（进行中）
- 语义相似性的向量数据库集成
- 提交消息分析的高级NLP
- 知识图谱构建
- 增强的模式识别

### 冲刺3：MCP集成（计划中）
- 完整的MCP服务器实现
- AI助手工具定义
- 上下文提供者接口
- 实时AI集成

### 冲刺4：高级功能（计划中）
- 智能代码建议
- 跨代码库学习
- 团队知识聚合
- 可视化经验探索

## 🤝 贡献

ADES是GAIT项目的一部分。欢迎贡献！

### 开发设置
```bash
# 克隆代码库
git clone <repo-url>
cd gait

# 安装依赖
go mod tidy

# 运行测试
go test ./internal/ades/...

# 构建并运行
go build && ./gait --repo .
```

### 添加新的模式检测器
```go
// 添加到 internal/ades/patterns/detector.go
{
    Name:        "您的模式",
    Type:        "pattern_type",
    Language:    "language",
    Regex:       regexp.MustCompile(`your_regex`),
    Description: "模式描述",
    Confidence:  0.8,
}
```

## 📄 许可证

ADES是GAIT的一部分，遵循相同的许可条款。

## 🆘 支持

- **问题**：在GAIT代码库中报告错误和功能请求
- **文档**：查看`AI_DEVELOPMENT_EXPERIENCE_SYSTEM.md`了解详细规范
- **路线图**：检查`ADES_ROADMAP_STATUS.md`了解当前进度

---

**准备好用AI驱动的经验提取革新您的开发工作流吗？今天就开始使用ADES！🚀**