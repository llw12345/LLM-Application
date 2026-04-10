
from agents.tool import tools
from chains.memory import get_llm, get_user_memory
from langchain.agents import AgentType, initialize_agent
import re

agent_cache = {}

def get_agent(user_id: str):
    if user_id not in agent_cache:
        llm = get_llm()
        memory = get_user_memory(user_id)
        agent = initialize_agent(
            tools=tools,
            llm=llm,
            memory=memory,
            agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
            verbose=True
        )
        agent_cache[user_id] = agent
    return agent_cache[user_id]

def clean_output(text: str) -> str:
    # 移除 "New input: ..." 之後的所有內容
    for marker in [
        "New input:",
        "Previous conversation history:",
        "Thought: Do I need",
        "Action:",
        "Action Input:",
        "Observation:",
    ]:
        if marker in text:
            text = text.split(marker)[0].strip()
    return text.strip()

def run_agent(user_id: str, prompt: str):
    result = get_agent(user_id).invoke(prompt)
    output = clean_output(result.get("output", ""))

    history = []
    for msg in result.get("chat_history", []):
        if isinstance(msg, dict):
            history.append(msg)
        else:
            history.append({
                "type": msg.type,
                "content": msg.content
            })

    return {"output": output, "chat_history": history}
