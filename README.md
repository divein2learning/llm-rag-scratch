# LLM-RAG-APP 部署说明

本项目为前后端分离的 RAG（Retrieval-Augmented Generation）应用，包含：
- 前端：React + Vite
- 后端：Python FastAPI

---

## 目录结构
- frontend/  前端源码（React/Vite）
- backend/   后端源码（FastAPI）
- models/    需手动下载的模型文件（未上传）
- vector_database/  需运行时生成的向量数据库（未上传）
- database/uploads/  上传文件存放目录（未上传）

---

## 1. 后端部署

### 环境要求
- Python 3.10+
- 推荐使用虚拟环境（venv 或 conda）

### 安装依赖
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows 用 venv\Scripts\activate
pip install -r requirements.txt
```

### 下载模型权重
> 以下命令需先安装 `git-lfs`，并保证网络可访问 Huggingface。

#### 下载主模型（Qwen3-1.7B）
```bash
mkdir -p models/qwen3
cd models/qwen3
# 推荐直接用 huggingface-cli
# 建议替换源 export HF_ENDPOINT=https://hf-mirror.com
# Win下用这个$env:HF_ENDPOINT = "https://hf-mirror.com"
huggingface-cli download Qwen/Qwen3-1.7B --local-dir .
cd ../..
```

#### 下载 Embedding 模型（Qwen3-Embedding-0.6B）
```bash
mkdir -p models/embedding
cd models/embedding
huggingface-cli download Qwen/Qwen3-Embedding-0.6B --local-dir .
cd ../..
```

### 启动后端服务
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 额外说明
- 向量数据库和上传文件目录会自动生成。
- 目前只支持单轮对话（single-turn），后续将尽快更新多轮对话（multi-turn）的记忆。
- 目前RAG引用的前端显示可能还有问题，预计这周会修复。
---

## 2. 前端部署

### 环境要求
- Node.js 16+
- 推荐使用 pnpm/yarn/npm

### 安装依赖
```bash
cd frontend
npm install
```

### 启动前端开发服务器
```bash
npm run dev
```

### 构建生产包
```bash
npm run build
```

---

## 3. 其他
- `.gitignore` 已自动排除大文件、依赖、数据库、模型权重等。

---

## 4. 常见问题
- 启动后端报模型缺失：请手动下载模型权重到 models/ 目录。
- 启动前端报依赖缺失：请先执行 npm install。

如有问题请提 issue。
