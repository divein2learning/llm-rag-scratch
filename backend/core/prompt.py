from langchain.prompts import PromptTemplate

zh_prompt = PromptTemplate(
    template="""请根据以下内容回答用户的问题，答案请用中文简明扼要地回复。\n{context}\n问题：{question}\n答案：""",
    input_variables=["context", "question"]
)

judge_prompt = PromptTemplate(
    template="""你是一个智能助手。请判断用户的问题是否需要查阅知识库（如涉及具体文档、事实、数据、专业知识等），还是可以直接用常识或模型自身知识回答。只需回答“需要”或“不需要”。\n问题：{question}\n答案：""",
    input_variables=["question"]
)