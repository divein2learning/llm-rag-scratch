# backend/api/rag.py
from fastapi import APIRouter
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import json
from ..core.llm import llm_chat
from ..core.vectorstore import get_embeddings, get_vectorstore
from ..core.prompt import zh_prompt, judge_prompt
from .config import MODEL_PATH, EMBEDDING_MODEL, EMBEDDING_CACHE, VECTOR_DB_DIR
import logging
from queue import Queue, Empty
import threading

# 设置logger
logger = logging.getLogger("rag")
logging.basicConfig(level=logging.INFO)

router = APIRouter()

# ==== 单例缓存 ==== #
embeddings = None
vectorstore = None
llm_raw_model = None
llm_raw_tokenizer = None

# ==== 单例加载 ==== #
def get_embeddings_singleton():
    global embeddings
    if embeddings is None:
        logger.info("Loading embeddings model...")
        import torch
        from transformers import AutoModel, AutoTokenizer
        try:
            embeddings = get_embeddings(str(EMBEDDING_MODEL), str(EMBEDDING_CACHE), torch_dtype=torch.bfloat16)
        except Exception as e:
            logger.warning(f"embeddings bfloat16 加载失败，尝试 float16: {e}")
            try:
                embeddings = get_embeddings(str(EMBEDDING_MODEL), str(EMBEDDING_CACHE), torch_dtype=torch.float16)
            except Exception as e2:
                logger.warning(f"embeddings float16 加载失败，回退 float32: {e2}")
                embeddings = get_embeddings(str(EMBEDDING_MODEL), str(EMBEDDING_CACHE), torch_dtype=torch.float32)
    return embeddings

def get_vectorstore_singleton():
    global vectorstore
    if vectorstore is None:
        logger.info("Loading vectorstore...")
        vectorstore = get_vectorstore(str(VECTOR_DB_DIR), get_embeddings_singleton())
    return vectorstore

def get_llm_raw():
    global llm_raw_model, llm_raw_tokenizer
    if llm_raw_model is None or llm_raw_tokenizer is None:
        from transformers import AutoTokenizer, AutoModelForCausalLM
        import torch
        model_path = str(MODEL_PATH)
        logger.info("[Agent] Loading raw LLM and tokenizer (singleton)...")
        llm_raw_tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
        # 优先尝试bfloat16，若不支持可改为float16
        try:
            llm_raw_model = AutoModelForCausalLM.from_pretrained(
                model_path,
                device_map="auto",
                torch_dtype=torch.bfloat16,
                trust_remote_code=True
            )
        except Exception as e:
            logger.warning(f"bfloat16 加载失败，尝试 float16: {e}")
            try:
                llm_raw_model = AutoModelForCausalLM.from_pretrained(
                    model_path,
                    device_map="auto",
                    torch_dtype=torch.float16,
                    trust_remote_code=True
                )
            except Exception as e2:
                logger.warning(f"float16 加载失败，回退 float32: {e2}")
                llm_raw_model = AutoModelForCausalLM.from_pretrained(
                    model_path,
                    device_map="auto",
                    torch_dtype=torch.float32,
                    trust_remote_code=True
                )
    return llm_raw_model, llm_raw_tokenizer

# ==== Agent判断 ==== #
def should_use_knowledge_base(question: str) -> bool:
    model, tokenizer = get_llm_raw()
    prompt = judge_prompt.format(question=question)
    logger.info(f"[Agent] 判断是否需要知识库检索，问题: {question}")
    logger.info(f"[Agent] 判断用Prompt: {prompt}")
    messages = [{"role": "user", "content": prompt}]
    chat_result = llm_chat(model, tokenizer, messages, enable_thinking=False)
    result = chat_result["content"].strip()
    logger.info(f"[Agent] LLM判断结果: {result}")
    return "需要" in result and "不需要" not in result

# ==== QA Chain ==== #
def get_qa_chain():
    # 已废弃，不再使用langchain封装
    pass

# ==== 公共处理函数 ==== #
def run_rag_chain(question):
    # 1. 检索相关文档
    vectorstore = get_vectorstore_singleton()
    retriever = vectorstore.as_retriever()
    docs = retriever.get_relevant_documents(question)
    # 2. 拼接上下文
    context = "\n".join([getattr(doc, 'page_content', str(doc)) for doc in docs])
    # 3. 构造prompt并调用llm_chat
    model, tokenizer = get_llm_raw()
    prompt = f"已知信息：\n{context}\n问题：{question}"
    logger.info(f"[Agent] RAG Chain Prompt: {prompt}")
    messages = [{"role": "user", "content": prompt}]
    chat_result = llm_chat(model, tokenizer, messages)
    answer = chat_result.get('content', '')
    thinking = chat_result.get('thinking', '')
    # 4. sources去重，只保留真实文献内容
    seen = set()
    sources = []
    for doc in docs:
        content = getattr(doc, 'page_content', None) or str(doc)
        meta = getattr(doc, 'metadata', {})
        file_name = meta.get('source') or meta.get('file_name') or ''
        display = f"{file_name} | {content[:120]}" if file_name else content[:120]
        if display not in seen:
            seen.add(display)
            sources.append(display)
    return answer, sources, thinking

def run_llm_chat(question):
    model, tokenizer = get_llm_raw()
    messages = [{"role": "user", "content": question}]
    chat_result = llm_chat(model, tokenizer, messages)
    answer = chat_result['content'] or "你好！请问有什么可以帮您？"
    thinking = chat_result.get('thinking', '')
    return answer, thinking

# ==== 请求体 ==== #
class QueryRequest(BaseModel):
    question: str
    messages: list = []  # 新增，支持多轮对话

# ==== API ==== #

def _query_agent_logic(question: str):
    if should_use_knowledge_base(question):
        logger.info("[Agent] 走RAG检索流程")
        answer, sources, thinking = run_rag_chain(question)
    else:
        logger.info("[Agent] 直接用LLM chat+thinking回答")
        answer, thinking = run_llm_chat(question)
        logger.info(f"[Agent] LLM思维链: {thinking}")
        logger.info(f"[Agent] LLM最终回答: {answer}")
        sources = []
    if "答案：" in answer:
        answer = answer.split("答案：", 1)[-1].strip()
    return {
        "thinking": thinking or "",
        "answer": answer or "",
        "sources": sources
    }

@router.post("/query")
def query_agent(request: QueryRequest):
    logger.info(f"[Agent] /query 收到问题: {request.question}")
    logger.info(f"[Agent] 当前上下文: {request.messages}")
    def event_stream():
        model, tokenizer = get_llm_raw()
        # 支持多轮对话，拼接历史
        messages = request.messages + [{"role": "user", "content": request.question}]
        q = Queue()
        def stream_callback(text):
            q.put(json.dumps({"delta": text}, ensure_ascii=False) + "\n")
        def run_llm():
            result = llm_chat(model, tokenizer, messages, stream_callback=stream_callback)
            q.put(json.dumps({"finish": True, "result": result}, ensure_ascii=False) + "\n")
            q.put(None)  # 结束标志
        t = threading.Thread(target=run_llm)
        t.start()
        while True:
            item = q.get()
            if item is None:
                break
            yield item
    return StreamingResponse(event_stream(), media_type="application/json")