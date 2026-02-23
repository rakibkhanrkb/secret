
import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage, subscribeToChat, markMessagesAsRead, subscribeToUserProfile } from '../services/firebase';
import { Send, X, User } from 'lucide-react';
import { format } from 'date-fns';
import { ChatMessage, UserProfile } from '../types';

interface ChatWindowProps {
  userId: string;
  friendId: string;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ userId, friendId, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [friendProfile, setFriendProfile] = useState<UserProfile | null>(null);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToChat(userId, friendId, setMessages);
    const unsubProfile = subscribeToUserProfile(friendId, setFriendProfile);
    markMessagesAsRead(userId, friendId);
    return () => {
      unsubscribe();
      unsubProfile();
    };
  }, [userId, friendId]);

  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead(userId, friendId);
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, userId, friendId]);

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
    <div className="fixed bottom-0 right-4 z-[100] w-80 h-[450px] bg-white rounded-t-lg shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 hover:bg-gray-100 p-1 rounded-lg cursor-pointer transition-colors flex-1">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 relative">
            {friendProfile?.profileImageUrl ? (
              <img src={friendProfile.profileImageUrl} alt={friendId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white rounded-full"></div>
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900">{friendId}</h3>
            <p className="text-[10px] text-green-500 font-medium">সক্রিয় আছেন</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button className="p-1.5 hover:bg-gray-100 rounded-full text-[#1D4ED8]">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-[#1D4ED8]">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white scrollbar-thin scrollbar-thumb-gray-200">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
              <User className="w-8 h-8 text-gray-200" />
            </div>
            <p className="text-xs font-medium">চ্যাট শুরু করুন</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.fromUserId === userId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-2.5 px-3 rounded-2xl text-sm ${
                  msg.fromUserId === userId
                    ? 'bg-[#1D4ED8] text-white'
                    : 'bg-[#F0F2F5] text-gray-900'
                }`}
              >
                <p className="leading-tight">{msg.content}</p>
                <p className={`text-[8px] mt-1 text-right opacity-70`}>
                  {format(msg.createdAt, 'hh:mm a')}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
        <div className="flex-1 bg-[#F0F2F5] rounded-full flex items-center px-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="মেসেজ লিখুন..."
            className="bg-transparent border-none outline-none flex-1 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="text-[#1D4ED8] hover:bg-blue-50 p-2 rounded-full transition-all disabled:opacity-30"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
