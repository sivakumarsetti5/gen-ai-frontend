"use client";

import { askAI } from "@/lib/api/ai";
import { streamText } from "@/lib/utils/streamText";
import { useState,useEffect,useRef } from "react";

type Message = {
  role: "user" | "ai";
  text: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const handleAsk = async () => {
  if (!prompt.trim()) return;

  const userMessage:Message = { role: "user", text: prompt };
  setMessages(prev => [...prev, userMessage]);

  setLoading(true);

  try {
    const data = await askAI(prompt);

    let currentText = "";

    // Add empty AI message first
    setMessages(prev => [...prev, { role: "ai", text: "" }]);

    streamText(data.text, (chunk) => {
      currentText = chunk;

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "ai",
          text: currentText,
        };
        return updated;
      });
    });

  } catch {
    setMessages(prev => [
      ...prev,
      { role: "ai", text: "Error occurred" },
    ]);
  } finally {
    setLoading(false);
    setPrompt("");
  }
};
  useEffect(()=>{
    bottomRef?.current?.scrollIntoView({behavior:"smooth"})
  },[messages])

  
  return (
    <main className="p-10">
      <h1 className="mb-5 text-center text-2xl font-semibold">AI Deal Assistant</h1>

      <div className="flex items-center gap-3">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask something..."
          className="w-[300px] rounded-2xl border border-gray-400 p-2"
          onKeyDown={(e)=>{
            if(e.key==="Enter"){
              handleAsk()
            }}}
        />
        <button
          onClick={handleAsk}
          disabled={loading}
          className="border p-2 rounded-xl cursor-pointer disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </div>

      <section className="mt-5">
        <h2 className="font-semibold">Response</h2>
        <div className="mt-5 flex flex-col gap-3">
          {messages.length === 0 ? (
            <p className="text-gray-500">Start a conversation...</p>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl max-w-[70%] ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white self-end"
                    : "bg-gray-200 text-black self-start"
                }`}
              >
                {msg.text}
              </div>
            ))
          )}
          
          <div ref={bottomRef}/>
        </div>
      </section>
    </main>
  );
}
