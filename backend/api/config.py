from pathlib import Path

# 项目根目录
BASE_DIR = str(Path(__file__).resolve().parent.parent.parent)

# 主模型相关
MAIN_MODEL_NAME = "Qwen3-1.7B"  # 可根据实际模型名修改
MODEL_DIR = str(Path(BASE_DIR) / 'models')
MODEL_PATH = str(Path(MODEL_DIR) / 'qwen3')  # 本地 Transformers 结构目录

# Embedding 模型相关
EMBEDDING_MODEL = "Qwen/Qwen3-Embedding-0.6B"  # Huggingface Hub 名称
EMBEDDING_CACHE = str(Path(MODEL_DIR) / 'embedding')

# 数据与向量库
VECTOR_DB_DIR = str(Path(BASE_DIR) / 'vector_database')
UPLOAD_DIR = str(Path(BASE_DIR) / 'database' / 'uploads')

# 方便 import *
__all__ = [
    'BASE_DIR', 'MODEL_DIR', 'MODEL_PATH', 'MAIN_MODEL_NAME',
    'EMBEDDING_MODEL', 'EMBEDDING_CACHE',
    'VECTOR_DB_DIR', 'UPLOAD_DIR'
]
