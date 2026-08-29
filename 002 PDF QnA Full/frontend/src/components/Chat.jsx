import { useState, useRef, useEffect } from "react";
import api from "../api";

import Message from "./Message";

function Chat() {
  const [messages, setMessages] = useState([]);

  const [question, setQuestion] = useState("");

  const [loading, setLoading] = useState(false);

  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  async function send() {
    if (!question.trim()) return;

    const userMessage = {
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Thinking...",
      },
    ]);

    try {
      const res = await api.post("/chat", {
        question,
      });

      const aiMessage = {
        role: "assistant",
        content: res.data.answer,
        sources: res.data.sources,
      };

      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = aiMessage;
        return copy;
      });
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }

    setQuestion("");

    setLoading(false);
  }

  return (
    <div className="chat">
      <div className="messages">
        {messages.map((msg, index) => (
          <Message key={index} message={msg} />
        ))}
        <div ref={bottomRef}></div>
      </div>

      <div className="input-area">
        <input
          value={question}
          placeholder="Ask anything..."
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />

        <button onClick={send} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;
