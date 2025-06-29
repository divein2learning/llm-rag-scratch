# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.rag import router as rag_router
from .api.upload import router as upload_router  # 新增
from .api.vector_files import router as vector_files_router  # 新增
import os 

os.environ["CHROMA_TELEMETRY_OFF"] = "True"

app = FastAPI()

# 注册接口路由
app.include_router(rag_router, prefix="/api")
app.include_router(upload_router, prefix="/api")  # 新增
app.include_router(vector_files_router, prefix="/api")  # 新增
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发阶段允许所有来源
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the LLM RAG API!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)