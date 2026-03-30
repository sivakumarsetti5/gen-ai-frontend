"use client";

import { askAI } from "@/lib/api/ai";
import { streamText } from "@/lib/utils/streamText";
import { useState,useEffect,useRef } from "react";

type Product = {
  title: string;
  price: number;
  reason: string;
};

type Message = {
  role: "user" | "ai";
  text?: string;
  products?: Product[];
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const cacheRef = useRef<Map<string, Message>>(new Map());

  const handleAsk = async () => {
  if (!prompt.trim() || loading) return;

  const normalizedPrompt = prompt.trim().toLowerCase()

  if (cacheRef.current.has(normalizedPrompt)) {
  const cached = cacheRef.current.get(normalizedPrompt);
  
  if(!cached) return

  setMessages(prev => [
    ...prev,
    { role: "user", text: prompt }
  ]);

  setLoading(true);

  setTimeout(() => {
    setMessages(prev => [...prev, cached]);
    setLoading(false);

    requestAnimationFrame(()=>{
      bottomRef.current?.scrollIntoView({behavior:"smooth"})
    })
  }, 200);

  setPrompt("");
  return;
  }

  const userMessage:Message = { role: "user", text: prompt };
  setMessages(prev => [...prev, userMessage]);

  setLoading(true);

  try {
    const enhancedPrompt = `
      Return top 5 products based on this query: "${prompt}"

      Respond ONLY in JSON format like:
      [
        {
          "title": "Product name",
          "price": number,
          "reason": "Why recommended"
        }
      ]
      `;

    const data = await askAI(enhancedPrompt);

    const extractJSON = (text: string) => {
      try {
        console.log("text",text)
        const match = text.match(/\[[\s\S]*?\]/)
        console.log("match",match)
        return match ? JSON.parse(match[0]) : null;
      } catch {
        return null;
      }
    };

    const parsed = extractJSON(data.text) as Product[] | null;

    if (!parsed) {
      // streaming fallback
      setMessages(prev => [...prev, { role: "ai", text: "" }]);

      streamText(data.text, (chunk) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "ai",
            text: chunk,
          };
          return updated;
        });
      });

      cacheRef.current.set(normalizedPrompt,{
        role:"ai",
        text:data.text
      })
      return;
    }

    const aiMessage:Message = {role:"ai",products:parsed}
    cacheRef.current.set(normalizedPrompt,aiMessage)
    saveCache()
    setMessages(prev=>[...prev, aiMessage])

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

const clearChat = () => {
  setMessages([]);
  cacheRef.current.clear();
  localStorage.removeItem("chat_messages");
  localStorage.removeItem("chat_cache");
};

useEffect(()=>{
  bottomRef?.current?.scrollIntoView({behavior:"smooth"})
},[messages])

//Persist Messages
useEffect(() => {
localStorage.setItem("chat_messages", JSON.stringify(messages));
}, [messages]);

//Restore Messages on Load
useEffect(() => {
  try {
    const stored = localStorage.getItem("chat_messages");
    if (stored) {
      setMessages(JSON.parse(stored));
    }
  } catch {
    console.error("Failed to parse messages");
  }
}, []);

//Persist Cache
const saveCache = () => {
  const cacheArray = Array.from(cacheRef.current.entries());
  localStorage.setItem("chat_cache", JSON.stringify(cacheArray));
}

//Restore Cache
useEffect(() => {
const storedCache = localStorage.getItem("chat_cache");
if (storedCache) {
  const parsed = JSON.parse(storedCache);
  cacheRef.current = new Map(parsed);
}
}, []);
  
  return (
    <main className="p-10">
      <h1 className="mb-5 text-center text-2xl font-semibold">AI Assistant</h1>

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
          className="border border-gray-400 p-2 rounded-xl cursor-pointer disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
        <button onClick={clearChat} className="border border-gray-400 p-2 rounded-xl cursor-pointer">
          Clear Chat
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
                {msg.products ? (
                  <div className="flex flex-col gap-2">
                    {msg.products.map((p, idx) => (
                      <div key={idx} className="border p-2 rounded bg-white text-black">
                        <h3 className="font-bold">{p.title}</h3>
                        <p>₹{p.price}</p>
                        <p className="text-sm">{p.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            ))
          )}
          
          <div ref={bottomRef}/>
        </div>
      </section>
    </main>
  );
}
