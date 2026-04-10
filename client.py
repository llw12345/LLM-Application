
import requests
user_id = "u1"

while True:
    text = input("You: ")
    response = requests.post("http://localhost:8000/agent", json={"user_id": user_id, "text": text})
    result = response.json()["result"]

    # 直接取出 AI 的回答
    print("Bot:", result["output"])
    print()
