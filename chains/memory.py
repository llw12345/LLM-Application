
import os
from langchain_ollama import ChatOllama
from langchain.memory import ConversationBufferMemory

def get_llm():
    ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    return ChatOllama(
        model="mistral",
        base_url=ollama_host
    )

user_memories = {}

def get_user_memory(user_id: str):
    print(f"Retrieving memory for user: {user_id}")
    if user_id not in user_memories:
        user_memories[user_id] = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
    return user_memories[user_id]
