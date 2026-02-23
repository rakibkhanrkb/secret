
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { sendChatMessage, subscribeToChat } from '../services/firebase';
import { Send, X, User } from 'lucide-react';
import { format } from 'date-fns';

interface ChatWindowProps {
  userId: string;
  friendId: string;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ userId, friendId, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToChat(userId, friendId, setMessages);
    return () => unsubscribe();
  }, [userId, friendId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await sendChatMessage(userId, friendId, inputText.trim());
      setInputText('');
    } catch (error) {
      alert('মেসেজ পাঠাতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md h-[600px] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-rose-100">
        {/* Header */}
        <div className="bg-rose-500 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">{friendId}</h3>
              <p className="text-[10px] text-rose-100">Live Chat</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-rose-50/30">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
              <p className="italic text-sm">হাই বলো! চ্যাট শুরু করো...</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.fromUserId === userId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl text-sm shadow-sm ${
                    msg.fromUserId === userId
                      ? 'bg-rose-500 text-white rounded-tr-none'
                      : 'bg-white text-gray-800 rounded-tl-none border border-rose-100'
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className={`text-[8px] mt-1 ${msg.fromUserId === userId ? 'text-rose-100' : 'text-gray-400'}`}>
                    {format(msg.createdAt, 'hh:mm a')}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-rose-100 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="মেসেজ লেখো..."
            className="flex-1 px-4 py-3 rounded-xl border border-rose-100 focus:border-rose-400 outline-none text-sm transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white p-3 rounded-xl transition-all shadow-lg shadow-rose-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
