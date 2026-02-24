
import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage, subscribeToChat, markMessagesAsRead, subscribeToUserProfile } from '../services/firebase';
import { Send, X, User, ArrowLeft, Image as ImageIcon, Loader2 } from 'lucide-react';
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if (!inputText.trim() && !selectedImage) return;

    setIsSending(true);
    try {
      await sendChatMessage(userId, friendId, inputText.trim(), selectedImage || undefined);
      setInputText('');
      setSelectedImage(null);
    } catch (error) {
      alert('মেসেজ পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setIsSending(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('ছবিটি ২ মেগাবাইটের চেয়ে ছোট হতে হবে।');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-0 md:right-4 z-[100] w-full md:w-80 h-full md:h-[450px] bg-white md:rounded-t-lg shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 hover:bg-gray-100 p-1 rounded-lg cursor-pointer transition-colors flex-1">
          <button onClick={onClose} className="md:hidden p-1 hover:bg-gray-200 rounded-full mr-1">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
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
                {msg.imageUrl && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
                    <img src={msg.imageUrl} alt="Chat" className="w-full max-h-60 object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
                {msg.content && <p className="leading-tight">{msg.content}</p>}
                <p className={`text-[8px] mt-1 text-right opacity-70`}>
                  {format(msg.createdAt, 'hh:mm a')}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {selectedImage && (
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 relative">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
            <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full hover:bg-black/70"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleImageSelect}
        />
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
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
          disabled={isSending || (!inputText.trim() && !selectedImage)}
          className="text-[#1D4ED8] hover:bg-blue-50 p-2 rounded-full transition-all disabled:opacity-30"
        >
          {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
