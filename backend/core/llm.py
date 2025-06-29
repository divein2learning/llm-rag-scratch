import torch
import logging

# 新增：Qwen3 chat+thinking 推理接口
def llm_chat(model, tokenizer, messages, enable_thinking=True):
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=enable_thinking
    )
    model_inputs = tokenizer([text], return_tensors="pt").to(model.device)
    with torch.no_grad():
        generated_ids = model.generate(
            **model_inputs,
            max_new_tokens=1024
        )
    output_ids = generated_ids[0][len(model_inputs.input_ids[0]):].tolist()
    # 解析thinking内容
    try:
        # 151668 是 </think> 的 token id
        index = len(output_ids) - output_ids[::-1].index(151668)
    except ValueError:
        index = 0
    thinking_content = tokenizer.decode(output_ids[:index], skip_special_tokens=True).strip("\n")
    content = tokenizer.decode(output_ids[index:], skip_special_tokens=True).strip("\n")
    # 打印到终端
    logger = logging.getLogger("rag.llm")
    logger.info(f"[LLM] thinking: {thinking_content}")
    logger.info(f"[LLM] content: {content}")
    return {
        "thinking": thinking_content,
        "content": content
    }
