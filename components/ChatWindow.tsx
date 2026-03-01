
import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage, subscribeToChat, markMessagesAsRead, subscribeToUserProfile, deleteChatMessage, initiateCall, setTypingStatus, subscribeToTypingStatus, getPost } from '../services/firebase';
import { Send, X, User, ArrowLeft, Image as ImageIcon, Loader2, Check, Trash2, Phone, Video, Share2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ChatMessage, UserProfile, Post } from '../types';
import { compressImage } from '@/src/utils/imageUtils';

interface ChatWindowProps {
  userId: string;
  friendId: string;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ userId, friendId, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [friendProfile, setFriendProfile] = useState<UserProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [friendTyping, setFriendTyping] = useState(false);
  const [sharedPosts, setSharedPosts] = useState<{ [postId: string]: Post }>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const formatMessageDate = (timestamp: number) => {
    if (isToday(timestamp)) return format(timestamp, 'hh:mm a');
    if (isYesterday(timestamp)) return `গতকাল ${format(timestamp, 'hh:mm a')}`;
    return format(timestamp, 'dd/MM/yy hh:mm a');
  };

  const shouldShowDateSeparator = (index: number) => {
    if (index === 0) return true;
    const prevMsg = messages[index - 1];
    const currMsg = messages[index];
    const prevDate = new Date(prevMsg.createdAt).toDateString();
    const currDate = new Date(currMsg.createdAt).toDateString();
    return prevDate !== currDate;
  };

  const getDateSeparatorLabel = (timestamp: number) => {
    if (isToday(timestamp)) return 'আজ';
    if (isYesterday(timestamp)) return 'গতকাল';
    return format(timestamp, 'MMMM dd, yyyy');
  };

  useEffect(() => {
    const unsubscribe = subscribeToChat(userId, friendId, setMessages);
    const unsubFriendProfile = subscribeToUserProfile(friendId, setFriendProfile);
    const unsubUserProfile = subscribeToUserProfile(userId, setUserProfile);
    const unsubTyping = subscribeToTypingStatus(friendId, userId, setFriendTyping);
    markMessagesAsRead(userId, friendId);
    return () => {
      unsubscribe();
      unsubFriendProfile();
      unsubUserProfile();
      unsubTyping();
    };
  }, [userId, friendId]);

  useEffect(() => {
    // Fetch shared posts content
    const fetchSharedPosts = async () => {
      const postIds = messages.filter(m => m.sharedPostId).map(m => m.sharedPostId!) as string[];
      const uniquePostIds = Array.from(new Set(postIds));
      
      for (const postId of uniquePostIds) {
        if (!sharedPosts[postId]) {
          const post = await getPost(postId);
          if (post) {
            setSharedPosts(prev => ({ ...prev, [postId]: post }));
          }
        }
      }
    };
    
    if (messages.length > 0) {
      fetchSharedPosts();
      markMessagesAsRead(userId, friendId);
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, userId, friendId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      setTypingStatus(userId, friendId, true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTypingStatus(userId, friendId, false);
    }, 2000);
  };

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
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string);
          setSelectedImage(compressed);
        } catch (error) {
          console.error("Chat image compression error:", error);
          setSelectedImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (window.confirm('আপনি কি নিশ্চিত যে আপনি এই মেসেজটি ডিলিট করতে চান?')) {
      try {
        await deleteChatMessage(messageId);
      } catch (error) {
        alert('মেসেজ ডিলিট করতে সমস্যা হয়েছে।');
      }
    }
  };

  const handleStartCall = async (type: 'audio' | 'video') => {
    try {
      await initiateCall(userId, friendId, type);
    } catch (error) {
      alert('কল শুরু করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-4 z-[100] w-[95%] max-w-[340px] md:w-72 h-[70vh] md:h-[400px] bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-lg cursor-pointer transition-colors flex-1">
          <button onClick={onClose} className="md:hidden p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full mr-1">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600 relative">
            {friendProfile?.profileImageUrl ? (
              <img src={friendProfile.profileImageUrl} alt={friendId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white dark:border-gray-800 rounded-full"></div>
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">{friendProfile?.displayName || friendId}</h3>
            <p className="text-[10px] text-green-500 font-medium">সক্রিয় আছেন</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => handleStartCall('audio')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-[#1D4ED8] dark:text-blue-400"
            title="অডিও কল"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button 
            onClick={() => handleStartCall('video')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-[#1D4ED8] dark:text-blue-400"
            title="ভিডিও কল"
          >
            <Video className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-[#1D4ED8] dark:text-blue-400">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-2">
            <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
              <User className="w-8 h-8 text-gray-200 dark:text-gray-600" />
            </div>
            <p className="text-xs font-medium">চ্যাট শুরু করুন</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <React.Fragment key={msg.id}>
              {shouldShowDateSeparator(index) && (
                <div className="flex justify-center my-4">
                  <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {getDateSeparatorLabel(msg.createdAt)}
                  </span>
                </div>
              )}
              <div
                className={`flex ${msg.fromUserId === userId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-2.5 px-3 rounded-2xl text-sm ${
                    msg.fromUserId === userId
                      ? 'bg-[#1D4ED8] dark:bg-blue-600 text-white'
                      : 'bg-[#F0F2F5] dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {msg.imageUrl && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-white/20 dark:border-gray-700">
                      <img src={msg.imageUrl} alt="Chat" className="w-full max-h-60 object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  {msg.sharedPostId && sharedPosts[msg.sharedPostId] && (
                    <div className="mb-2 p-2 bg-white/10 dark:bg-black/20 rounded-lg border border-white/20 dark:border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Share2 className="w-3 h-3 opacity-70" />
                        <span className="text-xs font-bold opacity-70">শেয়ার করা পোস্ট</span>
                      </div>
                      {sharedPosts[msg.sharedPostId].imageUrl && (
                        <div className="mb-1 rounded-md overflow-hidden h-20 w-full">
                          <img src={sharedPosts[msg.sharedPostId].imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <p className="text-xs line-clamp-2 opacity-90">{sharedPosts[msg.sharedPostId].content}</p>
                    </div>
                  )}
                  {msg.content && <p className="leading-tight">{msg.content}</p>}
                  <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                    {msg.fromUserId === userId && (
                      <button 
                        onClick={() => handleDeleteMessage(msg.id!)}
                        className="p-1 hover:bg-white/20 rounded-full mr-auto transition-colors"
                        title="ডিলিট করুন"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    <p className="text-[10px] font-medium">
                      {format(msg.createdAt, 'hh:mm a')}
                    </p>
                    {msg.fromUserId === userId && msg.read && (
                      <Check className="w-3 h-3" />
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))
        )}
        {friendTyping && (
          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 italic animate-pulse">
            {friendProfile?.displayName || 'Friend'} টাইপ করছেন...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {selectedImage && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 relative">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
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
      <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-2 items-center">
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
          className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <div className="flex-1 bg-[#F0F2F5] dark:bg-gray-700 rounded-full flex items-center px-3">
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="মেসেজ লিখুন..."
            className="bg-transparent border-none outline-none flex-1 py-2 text-sm dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <button
          type="submit"
          disabled={isSending || (!inputText.trim() && !selectedImage)}
          className="text-[#1D4ED8] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-full transition-all disabled:opacity-30"
        >
          {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
