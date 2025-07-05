import torch
import logging

# 手动token-by-token流式输出

def llm_chat(model, tokenizer, messages, enable_thinking=True, stream_callback=None, max_new_tokens=1024):
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=enable_thinking
    )
    input_ids = tokenizer(text, return_tensors="pt").input_ids.to(model.device)
    generated = input_ids.clone()
    past_key_values = None
    eos_token_id = getattr(tokenizer, 'eos_token_id', None)
    stop = False
    for _ in range(max_new_tokens):
        if past_key_values is None:
            outputs = model(input_ids=generated, use_cache=True)
        else:
            outputs = model(input_ids=generated[:, -1:], use_cache=True, past_key_values=past_key_values)
        logits = outputs.logits[:, -1, :]
        next_token_id = torch.argmax(logits, dim=-1, keepdim=True)
        generated = torch.cat([generated, next_token_id], dim=-1)
        past_key_values = outputs.past_key_values
        # 逐token推送
        if stream_callback:
            stream_callback(tokenizer.decode(next_token_id[0], skip_special_tokens=True))
        if eos_token_id is not None and next_token_id[0].item() == eos_token_id:
            break
    # 拼接所有输出
    full_output = tokenizer.decode(generated[0][input_ids.shape[1]:], skip_special_tokens=True)
    # 解析thinking内容
    # 151668 是 </think> 的 token id
    output_ids = tokenizer(full_output, return_tensors="pt").input_ids[0].tolist()
    try:
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
