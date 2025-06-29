from fastapi import APIRouter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from .config import VECTOR_DB_DIR, EMBEDDING_MODEL, EMBEDDING_CACHE

router = APIRouter()

embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL, cache_folder=str(EMBEDDING_CACHE))

@router.get("/vector_files")
def list_vector_files():
    db = Chroma(persist_directory=str(VECTOR_DB_DIR), embedding_function=embeddings)
    all_metadatas = db.get(include=['metadatas'])['metadatas']
    file_set = set()
    for meta in all_metadatas:
        if isinstance(meta, dict) and 'source_file' in meta:
            file_set.add(meta['source_file'])
    return {"files": list(file_set)}
