# [[C:\Users\leong\Desktop\LLM-Application\readme.md]]

# 🤖 LLM Application

一個本地全端 AI 應用程式，使用 **Mistral**（透過 Ollama）作為語言模型，**FastAPI** 作為後端，**React** 作為前端介面。支援對話聊天、AI Agent 工具呼叫、文字摘要和情感分析，完全在本地運行，不需要任何 API 金鑰。

---

## 📁 專案結構

```
LLM-Application/
├── app.py                  # FastAPI 主伺服器，定義所有 API 路由
├── chatbot.py              # 簡單聊天功能
├── client.py               # 終端機測試客戶端
├── Dockerfile              # 後端 Docker 映像設定
├── docker-compose.yml      # 同時啟動 app + ollama 容器
├── requirements.txt        # Python 套件相依清單
├── .gitignore
│
├── agents/
│   ├── executor.py         # LangChain Agent 邏輯與快取
│   └── tool.py             # Agent 工具定義（摘要、情感分析）
│
├── chains/
│   ├── memory.py           # LLM 實例與每位用戶的對話記憶
│   ├── sentiment.py        # 情感分析鏈
│   └── summarizer.py       # 文字摘要鏈
│
└── frontend/               # React 前端（Vite）
    └── src/
        ├── App.jsx         # 主介面，包含所有 Tab
        └── main.jsx        # React 入口點
```

---

## 🛠️ 技術棧

| 工具 | 角色 |
|------|------|
| **Mistral** | 語言模型 — 理解並生成文字 |
| **Ollama** | 本地 LLM 伺服器 — 在你的電腦上運行 Mistral |
| **LangChain** | AI 框架 — 管理 Chain、記憶、Agent |
| **FastAPI** | 後端 API 伺服器 |
| **Uvicorn** | 執行 FastAPI 的 ASGI 伺服器 |
| **Pydantic** | API 輸入資料驗證 |
| **React + Vite** | 前端使用者介面 |
| **Docker** | 容器化後端與 Ollama |

---

## 🚀 安裝與啟動

### 前置需求

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/)（前端需要）

### 第一步：複製專案

```bash
git clone https://github.com/llw12345/LLM-Application.git
cd LLM-Application
```

### 第二步：啟動後端與 Ollama

```bash
docker compose up -d
```

### 第三步：下載 Mistral 模型

```bash
docker exec -it llm-application-ollama-1 ollama pull mistral
```

> ⚠️ Mistral 約 4GB，只需下載一次，模型會儲存在 Docker Volume 中，重啟後不需重新下載。

### 第四步：安裝並啟動前端

```bash
cd frontend
npm install
npm run dev
```

### 第五步：開啟應用程式

```
http://localhost:5173
```

API 文件（Swagger UI）：
```
http://localhost:8000/docs
```

---

## 🌐 API 路由

所有路由接受 `POST` 請求，JSON 格式：
```json
{
  "user_id": "u1",
  "text": "你的輸入文字"
}
```

| 路由 | 說明 |
|------|------|
| `POST /summarize` | 文字摘要 |
| `POST /sentiment` | 情感分析 |
| `POST /chat` | 有記憶的對話聊天 |
| `POST /agent` | AI Agent（可使用工具） |
| `POST /run-all` | 同時執行摘要 + 情感分析 |

---

## 🧠 交互原理

### 整體架構

```
瀏覽器（React :5173）
        │
        │  HTTP POST
        ▼
FastAPI（app.py :8000）
        │
        ├──/chat──────────► chatbot.py
        ├──/summarize────► chains/summarizer.py
        ├──/sentiment────► chains/sentiment.py
        ├──/agent────────► agents/executor.py
        └──/run-all──────► summarizer + sentiment
                │
                ▼
        chains/memory.py（LLM + 每位用戶的記憶）
                │
                ▼
        Ollama（:11434）
                │
                ▼
        Mistral（AI 語言模型）
```

---

### 1. LLM 與記憶（`chains/memory.py`）

這是整個專案的核心共用模組，所有其他模組都依賴它。

- 提供共享的 **Mistral LLM** 實例（透過 Ollama）
- 使用 `ConversationBufferMemory` 為每位用戶維護獨立的對話記憶
- 每個 `user_id` 有自己的記憶，對話互不干擾

```
user_memories = {
    "u1": [你好 / 你好！, 法國首都? / 巴黎],
    "u2": [Hello / Hi!, ...],
}
```

> ⚠️ 記憶儲存在 RAM 中，容器重啟後會消失。

---

### 2. 記憶的運作原理

LLM 本身沒有記憶，每次呼叫都是全新對話。LangChain 的解決方式是把完整對話歷史附加到每次請求中：

```
第一次：你說 "我叫 John"       → LLM 回答 "你好 John！"

第二次：送給 LLM：
        [歷史] 你說: "我叫 John"
        [歷史] 我說: "你好 John！"
        [新問題] "我叫什麼名字？"
                                → LLM 回答 "你叫 John"
```

---

### 3. Chain（`chains/`）

Chain 把 **Prompt Template** 與 **LLM** 串接起來：

```python
# summarizer.py
template = PromptTemplate.from_template("Summarize:\n{text}")
result = llm.invoke(template.format(text=text))
return result.content
```

| Chain | Prompt | 輸出 |
|-------|--------|------|
| `summarizer.py` | "Summarize the following text: {text}" | 摘要文字 |
| `sentiment.py` | "Analyze the sentiment of: {text}" | 情感分析結果 |

---

### 4. Agent（`agents/`）

Agent 是最強大的功能。不同於簡單的 Chain，Agent 會**自動判斷要使用哪個工具**：

```
你的輸入: "幫我摘要這段文字：..."
        │
        ▼
Agent 思考: "需要使用工具嗎？是的"
        │
        ├── 需要摘要 → 呼叫 Summarize 工具
        └── 需要情感分析 → 呼叫 Sentiment 工具
                │
                ▼
        回傳結果給用戶
```

可用工具：

| 工具 | 說明 |
|------|------|
| `Summarize` | 把文字濃縮成重點 |
| `Sentiment Analysis` | 分析文字的情感傾向 |

Agent 同樣有每位用戶的對話記憶。

---

### 5. CORS 設定

前端（`:5173`）和後端（`:8000`）在不同 Port，瀏覽器預設會阻擋跨來源請求。`CORSMiddleware` 告訴瀏覽器允許這些請求：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # 允許所有來源（僅開發環境）
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### 6. Docker 架構

兩個容器透過 `docker-compose.yml` 一起啟動：

```
Docker 內部網路
    ├── ollama 容器（ollama/ollama）:11434  ← 在本地運行 Mistral
    └── app 容器（llm-app）        :8000   ← 運行 FastAPI
```

`app` 容器透過 Docker 內部網路連接 `ollama`：

```python
ChatOllama(model="mistral", base_url="http://ollama:11434")
```

模型資料儲存在 Docker Volume（`ollama_data`），重啟後不需重新下載。

---

## 💻 前端介面

React UI 有 5 個 Tab：

| Tab | 使用的 API | 說明 |
|-----|-----------|------|
| **Chat** | `/chat` | 有記憶的對話聊天 |
| **Agent** | `/agent` | 可使用工具的 AI Agent |
| **Summarize** | `/summarize` | 貼上文字取得摘要 |
| **Sentiment** | `/sentiment` | 貼上文字分析情感 |
| **Run All** | `/run-all` | 同時執行摘要 + 情感分析 |

Chat 和 Agent Tab 會顯示完整對話歷史，點擊 **Clear** 按鈕可清除。

---

## 🔧 常用指令

```bash
# 啟動所有服務
docker compose up -d

# 停止所有服務
docker compose down

# 修改程式碼後重新 build
docker compose down && docker compose up --build -d

# 查看後端 log
docker compose logs app --tail=50

# 下載其他模型（例如更小的 phi3）
docker exec -it llm-application-ollama-1 ollama pull phi3

# 啟動前端
cd frontend && npm run dev
```

---

## ⚠️ 已知限制

| 限制 | 說明 |
|------|------|
| 重啟後記憶消失 | 記憶存在 RAM，未持久化到資料庫 |
| 回應速度較慢 | Mistral 在 Docker 容器內用 CPU 運行 |
| Agent 偶爾洩漏內部推理 | LangChain 舊版 Agent 的已知問題 |
| 單一用戶 | 前端 `user_id` 寫死為 `"u1"` |

---

## 🔄 可改進方向

- 使用 SQLite 或 Redis 持久化記憶
- 加入用戶驗證與多用戶支援
- 串流回應（token by token）
- 加入更多 Agent 工具（網路搜尋、計算機等）
- 改用更快的模型（`phi3`、`gemma:2b`）

# [[codefulty.com]]



🤖 LLM Application
A full-stack AI application powered by Mistral (via Ollama), built with FastAPI backend and React frontend. Supports conversational chat, AI agent with tools, text summarization, and sentiment analysis — all running locally with no API keys required.

📁 Project Structure
LLM-Application/
├── app.py                  # FastAPI main server & API routes
├── chatbot.py              # Simple chat function
├── client.py               # Terminal-based test client
├── Dockerfile              # Docker image for backend
├── docker-compose.yml      # Orchestrates app + ollama containers
├── requirements.txt        # Python dependencies
├── .gitignore
│
├── agents/
│   ├── executor.py         # LangChain Agent logic & cache
│   └── tool.py             # Agent tools (Summarize, Sentiment)
│
├── chains/
│   ├── memory.py           # LLM instance & per-user memory
│   ├── sentiment.py        # Sentiment analysis chain
│   └── summarizer.py       # Text summarization chain
│
└── frontend/               # React frontend (Vite)
    └── src/
        ├── App.jsx         # Main UI with all tabs
        └── main.jsx        # React entry point

🛠️ Tech Stack
ToolRoleMistralLLM — understands and generates textOllamaLocal LLM server — runs Mistral on your machineLangChainAI framework — manages chains, memory, agentsFastAPIBackend API serverUvicornASGI server that runs FastAPIPydanticData validation for API inputsReact + ViteFrontend UIDockerContainerizes backend + Ollama

🚀 Getting Started
Prerequisites

Docker Desktop
Node.js (for frontend)

1. Clone the repository
bashgit clone https://github.com/llw12345/LLM-Application.git
cd LLM-Application
2. Start backend + Ollama with Docker
bashdocker compose up -d
3. Download the Mistral model
bashdocker exec -it llm-application-ollama-1 ollama pull mistral

⚠️ Mistral is ~4GB. This only needs to be done once — the model is saved in a Docker volume.

4. Install and start the frontend
bashcd frontend
npm install
npm run dev
5. Open the app
http://localhost:5173

🌐 API Endpoints
All endpoints accept POST requests with JSON body:
json{
  "user_id": "u1",
  "text": "your input text"
}
EndpointDescriptionPOST /summarizeSummarize input textPOST /sentimentAnalyze sentiment of input textPOST /chatSimple chat with memoryPOST /agentAI Agent with tools (Summarize + Sentiment)POST /run-allRun Summarize + Sentiment together
Interactive API docs available at: http://localhost:8000/docs

🧠 How It Works
Overall Architecture
Browser (React :5173)
        │
        │  HTTP POST
        ▼
FastAPI (app.py :8000)
        │
        ├──/chat──────────► chatbot.py
        ├──/summarize────► chains/summarizer.py
        ├──/sentiment────► chains/sentiment.py
        ├──/agent────────► agents/executor.py
        └──/run-all──────► summarizer + sentiment
                │
                ▼
        chains/memory.py  (LLM + per-user memory)
                │
                ▼
        Ollama (:11434)
                │
                ▼
        Mistral (AI model)

1. LLM & Memory (chains/memory.py)
The central module used by all other components.

Provides a shared Mistral LLM instance via Ollama
Maintains per-user conversation memory using ConversationBufferMemory
Each user_id gets its own isolated memory — conversations never mix

user_memories = {
    "u1": [Hello / Hi!, What is AI? / AI is...],
    "u2": [你好 / 你好！, ...],
}

⚠️ Memory is stored in RAM — it resets when the Docker container restarts.


2. How Memory Works
LLMs have no built-in memory. LangChain solves this by appending the full conversation history to every new request:
Request 1:  "My name is John"         → LLM: "Hello John!"
Request 2:  [History: My name is John / Hello John!]
            + "What is my name?"      → LLM: "Your name is John"
Without memory, the LLM would answer "I don't know" to the second question.

3. Chains (chains/)
Chains connect a Prompt Template with the LLM:
python# summarizer.py
template = PromptTemplate.from_template("Summarize:\n{text}")
result = llm.invoke(template.format(text=text))
return result.content
ChainPromptOutputsummarizer.py"Summarize the following text: {text}"Summary textsentiment.py"Analyze the sentiment of: {text}"Sentiment analysis

4. Agent (agents/)
The Agent is the most powerful feature. Unlike simple chains, it decides which tool to use based on your input:
Your input: "Summarize and analyze this text: ..."
        │
        ▼
Agent thinks: "Do I need a tool? Yes"
        │
        ├── Needs summarization → calls Summarize tool
        └── Needs sentiment     → calls Sentiment tool
                │
                ▼
        Returns combined result
Available tools:
ToolDescriptionSummarizeCondenses text into key pointsSentiment AnalysisAnalyzes emotional tone
Agent also maintains per-user memory, so it remembers previous messages in the conversation.

5. CORS
The frontend (:5173) and backend (:8000) run on different ports. Browsers block cross-origin requests by default. CORSMiddleware in app.py tells the browser to allow these requests:
pythonapp.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Allow all origins (development only)
    allow_methods=["*"],
    allow_headers=["*"],
)

6. Docker Setup
Two containers run together via docker-compose.yml:
Docker Network
    ├── ollama (ollama/ollama)  :11434  ← Runs Mistral locally
    └── app    (llm-app)        :8000   ← Runs FastAPI
The app container connects to ollama via Docker's internal network using the hostname ollama:
pythonChatOllama(model="mistral", base_url="http://ollama:11434")
Model data is persisted in a Docker volume (ollama_data) so you don't need to re-download Mistral after restarts.

💻 Frontend (React)
The React UI has 5 tabs:
TabAPI UsedDescriptionChat/chatSimple conversation with memoryAgent/agentAI Agent that can use toolsSummarize/summarizePaste text to get a summarySentiment/sentimentPaste text to analyze emotionRun All/run-allSummarize + Sentiment at once
Chat and Agent tabs maintain visible conversation history. Use the Clear button to reset history.

🔧 Common Commands
bash# Start all services
docker compose up -d

# Stop all services
docker compose down

# Rebuild after code changes
docker compose down && docker compose up --build -d

# View backend logs
docker compose logs app --tail=50

# Download a different model
docker exec -it llm-application-ollama-1 ollama pull llama3

# Start frontend
cd frontend && npm run dev

⚠️ Known Limitations
LimitationDetailsMemory resets on restartStored in RAM, not persisted to databaseSlow responsesMistral runs on CPU inside DockerAgent reasoning leaksOccasional internal thoughts visible in outputSingle user sessionuser_id is hardcoded as "u1" in the frontend

🔄 Possible Improvements

Persist memory to SQLite or Redis
Add user authentication
Stream responses token by token
Add more agent tools (web search, calculator)
Switch to a faster model (e.g. phi3, gemma:2b)
