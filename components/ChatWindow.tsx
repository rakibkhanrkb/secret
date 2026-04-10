
import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage, subscribeToChat, markMessagesAsRead, subscribeToUserProfile, deleteChatMessage, initiateCall, setTypingStatus, subscribeToTypingStatus, getPost, uploadFile } from '../services/firebase';
import { Send, X, User, ArrowLeft, Image as ImageIcon, Loader2, Check, Trash2, Phone, Video, Share2, Paperclip, FileText, Download } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ChatMessage, UserProfile, Post } from '../types';
import { compressImage, compressImageToBlob, base64ToBlob, compressForChat } from '@/src/utils/imageUtils';

interface ChatWindowProps {
  userId: string;
  friendId: string;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ userId, friendId, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const [friendProfile, setFriendProfile] = useState<UserProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [friendTyping, setFriendTyping] = useState(false);
  const [sharedPosts, setSharedPosts] = useState<{ [postId: string]: Post }>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const formatMessageDate = (timestamp: number) => {
    if (isToday(timestamp)) return format(timestamp, 'hh:mm a');
    if (isYesterday(timestamp)) return `গতকাল ${format(timestamp, 'hh:mm a')}`;
    return format(timestamp, 'dd/MM/yy hh:mm a');
  };

  const shouldShowDateSeparator = (allMsgs: ChatMessage[], index: number) => {
    if (index === 0) return true;
    const prevMsg = allMsgs[index - 1];
    const currMsg = allMsgs[index];
    if (!prevMsg || !currMsg) return false;
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
    if (!inputText.trim() && !selectedImage && !selectedFile && !selectedVideo) return;

    // Capture values to send
    const textToSend = inputText.trim();
    const imageToSend = selectedImage;
    const videoToSend = selectedVideo;
    const fileToSend = selectedFile;
    
    // Clear inputs immediately for instant feel
    setInputText('');
    setSelectedImage(null);
    setSelectedVideo(null);
    setSelectedFile(null);
    setShowAttachMenu(false);

    // Create optimistic message
    const tempId = 'temp-' + Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempId,
      fromUserId: userId,
      toUserId: friendId,
      content: textToSend,
      imageUrl: imageToSend || undefined,
      videoUrl: videoToSend || undefined,
      createdAt: Date.now(),
      read: false,
      isOptimistic: true // Custom flag to show loading state
    };

    setOptimisticMessages(prev => [...prev, optimisticMsg]);

    try {
      let fileData = undefined;
      let finalImageUrl = undefined;
      let finalVideoUrl = undefined;
      
      // Only use base64 for optimistic UI, not for final send if possible
      // unless it's very small and upload fails.

      if (fileToSend) {
        try {
          const url = await uploadFile(fileToSend, fileToSend.name || 'image.jpg', (progress) => {
            setUploadProgress(progress);
          });
          
          if (fileToSend.type.startsWith('image/')) {
            finalImageUrl = url;
          } else if (fileToSend.type.startsWith('video/')) {
            finalVideoUrl = url;
          } else {
            fileData = {
              url,
              name: fileToSend.name || 'file',
              type: fileToSend.type,
              size: fileToSend.size
            };
          }
        } catch (storageError) {
          console.error("Storage upload failed:", storageError);
          // Fallback to base64 ONLY if it's an image and small enough for Firestore (< 800KB)
          if (fileToSend.type.startsWith('image/') && imageToSend && imageToSend.length * 0.75 < 800 * 1024) {
            finalImageUrl = imageToSend;
          } else {
            throw new Error("ফাইল আপলোড ব্যর্থ হয়েছে। দয়া করে আপনার ইন্টারনেট কানেকশন চেক করুন।");
          }
        } finally {
          setUploadProgress(null);
        }
      }

      await sendChatMessage(
        userId, 
        friendId, 
        textToSend, 
        finalImageUrl, 
        undefined, 
        fileData,
        finalVideoUrl
      );
      
      // Remove optimistic message after successful send
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
    } catch (error) {
      console.error("Send error:", error);
      // Mark optimistic message as failed or remove it and restore inputs
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(textToSend);
      setSelectedImage(imageToSend);
      setSelectedVideo(videoToSend);
      setSelectedFile(fileToSend);
      alert('মেসেজ পাঠাতে সমস্যা হয়েছে। বড় ফাইল হলে ওয়াইফাই ব্যবহার করুন।');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert('ছবির সাইজ ২০ মেগাবাইটের বেশি হতে পারবে না।');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        // Fast compression for instant preview and much faster upload
        try {
          const compressed = await compressForChat(base64);
          setSelectedImage(compressed);
          // Convert compressed base64 back to blob for faster upload
          const blob = base64ToBlob(compressed);
          setSelectedFile(new File([blob], file.name, { type: 'image/jpeg' }));
        } catch (err) {
          console.error("Compression failed:", err);
          setSelectedImage(base64);
          setSelectedFile(file);
        }
      };
      reader.readAsDataURL(file);
      setShowAttachMenu(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert('ফাইল সাইজ ২০ মেগাবাইটের বেশি হতে পারবে না।');
        return;
      }
      
      if (file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedVideo(reader.result as string);
          setSelectedFile(file);
          setSelectedImage(null);
        };
        reader.readAsDataURL(file);
      } else {
        setSelectedFile(file);
        setSelectedImage(null);
        setSelectedVideo(null);
      }
      setShowAttachMenu(false);
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
            {friendProfile?.isOnline && (Date.now() - (friendProfile?.lastSeen || 0) < 120000) && (
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white dark:border-gray-800 rounded-full animate-pulse"></div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">{friendProfile?.displayName || friendId}</h3>
            {friendProfile?.isOnline && (Date.now() - (friendProfile?.lastSeen || 0) < 120000) ? (
              <p className="text-[10px] text-green-500 font-medium">সক্রিয় আছেন</p>
            ) : (
              <p className="text-[10px] text-gray-400 font-medium">অফলাইন</p>
            )}
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
        {messages.length === 0 && optimisticMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-2">
            <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
              <User className="w-8 h-8 text-gray-200 dark:text-gray-600" />
            </div>
            <p className="text-xs font-medium">চ্যাট শুরু করুন</p>
          </div>
        ) : (
          [...messages, ...optimisticMessages].map((msg, index, allMsgs) => (
            <React.Fragment key={msg.id || index}>
              {shouldShowDateSeparator(allMsgs, index) && (
                <div className="flex justify-center my-4">
                  <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {getDateSeparatorLabel(msg.createdAt)}
                  </span>
                </div>
              )}
              <div
                className={`flex ${msg.fromUserId === userId ? 'justify-end' : 'justify-start'} ${msg.isOptimistic ? 'opacity-70' : ''}`}
              >
                <div
                  className={`max-w-[85%] p-2.5 px-3 rounded-2xl text-sm relative ${
                    msg.fromUserId === userId
                      ? 'bg-[#1D4ED8] dark:bg-blue-600 text-white'
                      : 'bg-[#F0F2F5] dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {msg.isOptimistic && (
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    </div>
                  )}
                  {msg.imageUrl && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-white/20 dark:border-gray-700">
                      <img src={msg.imageUrl} alt="Chat" className="w-full max-h-60 object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  {msg.videoUrl && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-white/20 dark:border-gray-700">
                      <video src={msg.videoUrl} controls className="w-full max-h-60 object-cover" />
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
                  {msg.fileUrl && (
                    <div className="mb-2 p-2 bg-white/10 dark:bg-black/20 rounded-lg border border-white/20 dark:border-white/10 flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        {msg.fileType?.startsWith('image/') ? (
                          <ImageIcon className="w-6 h-6 text-blue-500" />
                        ) : (
                          <FileText className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{msg.fileName}</p>
                        <p className="text-xs opacity-70">{(msg.fileSize ? (msg.fileSize / 1024 / 1024).toFixed(2) : '0')} MB</p>
                      </div>
                      <a 
                        href={msg.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        download
                      >
                        <Download className="w-5 h-5" />
                      </a>
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

      {/* File Preview & Progress */}
      {(selectedImage || selectedVideo || selectedFile || uploadProgress !== null) && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 relative">
          {uploadProgress !== null && (
            <div className="absolute top-0 left-0 h-1 bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          )}
          {(selectedImage || selectedVideo || selectedFile) && (
            <div className="relative w-full max-w-[200px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 flex items-center gap-2">
              {selectedImage ? (
                <img src={selectedImage} alt="Preview" className="w-10 h-10 object-cover rounded" referrerPolicy="no-referrer" />
              ) : selectedVideo ? (
                <div className="w-10 h-10 bg-black rounded flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
              ) : (
                <FileText className="w-10 h-10 text-gray-400" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate dark:text-white">{selectedFile?.name || (selectedVideo ? 'Video' : 'Image')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {uploadProgress !== null ? `${Math.round(uploadProgress)}% আপলোড হচ্ছে...` : `${(selectedFile?.size ? (selectedFile.size / 1024 / 1024).toFixed(2) : '0')} MB`}
                </p>
              </div>
              {!isSending && (
                <button 
                  onClick={() => {
                    setSelectedImage(null);
                    setSelectedVideo(null);
                    setSelectedFile(null);
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-2 items-center">
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelect}
        />
        <input 
          type="file" 
          accept="image/*"
          className="hidden" 
          ref={imageInputRef}
          onChange={handleImageSelect}
        />
        
        <div className="relative">
          <button 
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          {showAttachMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[150px] z-50 animate-in slide-in-from-bottom-2 duration-200">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
              >
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">ছবি (Image)</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors border-t border-gray-100 dark:border-gray-700"
              >
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">ফাইল (File)</span>
              </button>
            </div>
          )}
        </div>
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
          disabled={isSending || (!inputText.trim() && !selectedImage && !selectedVideo && !selectedFile)}
          className="text-[#1D4ED8] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-full transition-all disabled:opacity-30"
        >
          {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
