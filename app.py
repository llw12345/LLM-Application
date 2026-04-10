# [[C:\Users\leong\Desktop\LLM-Application\app.py]]

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from chains.sentiment import sentiment
from chains.summarizer import summarize
from chatbot import chat
from agents.executor import run_agent

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextInput(BaseModel):
    user_id: str
    text: str

@app.post("/summarize")
def summarize_route(input: TextInput):
    return {"summary": str(summarize(input.text))}

@app.post("/sentiment")
def sentiment_route(input: TextInput):
    return {"sentiment": str(sentiment(input.text))}

@app.post("/chat")
def chat_route(input: TextInput):
    return {"reply": str(chat(input.user_id, input.text))}

@app.post("/agent")
def agent_route(input: TextInput):
    print("inside agent_route function in app.py")
    result = run_agent(input.user_id, input.text)
    return {
        "result": {
            "output": result.get("output", ""),
            "chat_history": result.get("chat_history", [])
        }
    }

@app.post("/run-all")
def run_all(input: TextInput):
    return {
        "summary": str(summarize(input.text)),
        "sentiment": str(sentiment(input.text)),
        "chat_reply": str(chat(input.user_id, input.text)),
    }

# [[codefulty.com]]