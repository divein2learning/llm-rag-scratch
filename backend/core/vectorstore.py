from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
import os

def get_embeddings(model_name, cache_folder):
    return HuggingFaceEmbeddings(model_name=model_name, cache_folder=cache_folder)

def get_vectorstore(persist_directory, embeddings):
    os.makedirs(persist_directory, exist_ok=True)
    return Chroma(persist_directory=persist_directory, embedding_function=embeddings)

def add_documents(docs, persist_directory, embeddings):
    db = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        persist_directory=persist_directory
    )
    db.persist()
    return db
