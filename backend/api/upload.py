# backend/api/upload.py
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from langchain_community.document_loaders import PyPDFLoader, UnstructuredWordDocumentLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
import os
import tempfile
from .config import (
    UPLOAD_DIR, VECTOR_DB_DIR, EMBEDDING_MODEL, EMBEDDING_CACHE
)

os.environ["CHROMA_TELEMETRY_OFF"] = "True"

router = APIRouter()

# 确保目录存在
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(VECTOR_DB_DIR, exist_ok=True)

# 初始化嵌入模型（只加载一次）
embeddings = None

def get_embeddings():
    global embeddings
    if embeddings is None:
        embeddings = HuggingFaceEmbeddings(model_name=str(EMBEDDING_MODEL), cache_folder=str(EMBEDDING_CACHE))
    return embeddings

# 文本切分器
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50
)

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    # 创建临时文件保存上传内容
    with tempfile.NamedTemporaryFile(delete=False) as tmpfile:
        content = await file.read()
        tmpfile.write(content)
        tmpfile_path = tmpfile.name

    try:
        # 保存上传的原始文件到UPLOAD_DIR
        save_path = os.path.join(UPLOAD_DIR, file.filename)  # 修正为os.path.join
        with open(save_path, "wb") as f:
            f.write(content)

        # 根据文件类型选择加载器
        if file.filename.lower().endswith(".pdf"):
            loader = PyPDFLoader(tmpfile_path)
        elif file.filename.lower().endswith((".docx", ".doc")):
            loader = UnstructuredWordDocumentLoader(tmpfile_path)
        else:
            return {"error": "Unsupported file type"}

        documents = loader.load()
        split_docs = text_splitter.split_documents(documents)

        # 增加：为每个文档块添加元数据，标记所属文件
        for doc in split_docs:
            if not hasattr(doc, 'metadata') or not isinstance(doc.metadata, dict):
                doc.metadata = {}
            doc.metadata['source_file'] = file.filename

        # 初始化嵌入模型（只加载一次）
        emb = get_embeddings()
        # 存入向量数据库，并持久化
        db = Chroma.from_documents(
            documents=split_docs,
            embedding=emb,
            persist_directory=str(VECTOR_DB_DIR)  # 强制转为str，避免Path类型报错
        )

        return JSONResponse(content={
            "message": f"成功上传并处理 {len(split_docs)} 个文本块",
            "filename": file.filename,
            "chunks": len(split_docs)
        }, status_code=200)

    except Exception as e:
        import traceback
        traceback.print_exc()  # 输出完整错误堆栈
        print("Upload error:", e)
        return JSONResponse(content={"error": str(e)}, status_code=500)

    finally:
        os.unlink(str(tmpfile_path))  # 删除临时文件，确保为str类型