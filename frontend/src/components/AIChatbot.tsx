import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, HelpCircle, X, ShieldCheck } from 'lucide-react';

interface AIChatbotProps {
  predictionId?: number;
  inline?: boolean;
}

export default function AIChatbot({ predictionId, inline = false }: AIChatbotProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Suggested questions
  const suggestions = [
    "What is glaucoma?",
    "Explain my latest prediction risk",
    "What foods should I eat?",
    "What foods should I avoid?",
    "Suggest daily eye exercises"
  ];

  // Fetch chat history on load
  const fetchChatHistory = async () => {
    try {
      const res = await fetch('/api/chatbot/history', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const history = await res.json();
        const formatted = history.map((chat: any) => ({
          sender: chat.role === 'user' ? 'user' : 'bot',
          text: chat.content,
          time: new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        
        if (formatted.length === 0) {
          setMessages([
            {
              sender: 'bot',
              text: "Hello! I am your AI EyeCare Assistant. I can help explain your retinal prediction reports, describe glaucoma symptoms, outline healthy lifestyle habits, suggest eye exercises, or set medicine reminders. Ask me anything about eye health!",
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        } else {
          setMessages(formatted);
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  // Autoscroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendQuery = async (text: string) => {
    if (!text.trim() || loading) return;

    // Add user message to UI
    const newMsg = {
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMsg]);
    setChatInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chatbot/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: text,
          prediction_id: predictionId
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: data.response,
            time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        const err = await res.json();
        setMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: err.detail || "Sorry, I am unable to connect to the medical AI model right now. Please check your credentials.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: "Communication timeout. Please verify your internet connection or backend endpoint.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!inline && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-teal-400 to-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all z-40"
      >
        <Bot className="w-6 h-6" />
      </button>
    );
  }

  const containerClasses = inline 
    ? "w-full h-[550px] border border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 shadow-sm flex flex-col overflow-hidden"
    : "fixed bottom-6 right-6 w-96 h-[500px] border border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden z-40 animate-slide-up";

  return (
    <div className={containerClasses}>
      
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-blue-600 p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <Bot className="w-5 h-5" />
          <div>
            <h3 className="font-semibold text-sm">EyeCare AI Copilot</h3>
            <span className="text-[10px] text-teal-100 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Dedicated Ophthalmology Agent
            </span>
          </div>
        </div>
        {!inline && (
          <button onClick={() => setIsOpen(false)} className="hover:bg-white/15 p-1 rounded-lg transition-all">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-950/20">
        {messages.map((m, idx) => {
          const isBot = m.sender === 'bot';
          return (
            <div key={idx} className={`flex gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}>
              {isBot && (
                <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs font-bold shrink-0 self-start">
                  AI
                </div>
              )}
              
              <div className="flex flex-col space-y-1 max-w-[75%]">
                <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  isBot 
                    ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-800 rounded-tl-none' 
                    : 'bg-teal-500 text-white rounded-tr-none'
                }`}>
                  {m.text.split('\n').map((para: string, pIdx: number) => (
                    <p key={pIdx} className={pIdx > 0 ? "mt-1.5" : ""}>{para}</p>
                  ))}
                </div>
                <span className={`text-[9px] text-gray-400 ${!isBot ? 'text-right' : ''}`}>{m.time}</span>
              </div>

              {!isBot && (
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0 self-start">
                  U
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs font-bold shrink-0">
              AI
            </div>
            <div className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 rounded-tl-none flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Suggestion Pills */}
      {messages.length < 3 && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => sendQuery(s)}
              className="text-[10px] bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-teal-500 hover:text-teal-500 rounded-full px-2.5 py-1 flex items-center gap-1 transition-all"
            >
              <HelpCircle className="w-3 h-3 text-teal-500" />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input panel */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex gap-2">
        <input
          type="text"
          placeholder="Ask eye health queries only..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendQuery(chatInput)}
          className="flex-1 border border-gray-200 dark:border-gray-700 bg-transparent dark:bg-gray-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-teal-500 dark:text-white"
        />
        <button
          onClick={() => sendQuery(chatInput)}
          disabled={loading || !chatInput.trim()}
          className="p-2.5 bg-teal-500 disabled:bg-gray-200 dark:disabled:bg-gray-800 text-white rounded-xl hover:bg-teal-600 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
