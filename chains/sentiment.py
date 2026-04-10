
from langchain_core.prompts import PromptTemplate
from chains.memory import get_llm

template = PromptTemplate.from_template("Analyze the sentiment of the following text:\n{text}\n")

def sentiment(text: str):
    print(f"Analyzing sentiment for text: {text}")
    llm = get_llm()
    result = llm.invoke(template.format(text=text))
    return result.content  # ← 只取文字內容
