
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, User, ArrowLeft, MessageSquare, Image as ImageIcon, Trash2, Shield, Users, Link as LinkIcon, X, Check, UserPlus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Group, GroupMessage } from '../types';

interface GroupChatProps {
  userId: string;
  userName: string;
  group: Group;
  friends: string[];
  onBack: () => void;
}

const GroupChat: React.FC<GroupChatProps> = ({ userId, userName, group, friends, onBack }) => {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addedMemberStatus, setAddedMemberStatus] = useState<{ [key: string]: string }>({});
  const [removedMemberStatus, setRemovedMemberStatus] = useState<{ [key: string]: string }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit('join_room', group.id);

    newSocket.on('initial_messages', (initialMessages: GroupMessage[]) => {
      setMessages(initialMessages);
    });

    newSocket.on('new_group_message', (message: GroupMessage) => {
      if (message.groupId === group.id) {
        setMessages((prev) => [...prev, message]);
      }
    });

    newSocket.on('member_removed', (data: { groupId: string, memberId: string }) => {
      if (data.groupId === group.id && data.memberId === userId) {
        onBack();
      }
    });

    newSocket.on('member_removed_success', (data: { groupId: string, memberId: string }) => {
      if (data.groupId === group.id) {
        setRemovedMemberStatus(prev => ({ ...prev, [data.memberId]: 'রিমুভড!' }));
        setTimeout(() => {
          setRemovedMemberStatus(prev => {
            const newState = { ...prev };
            delete newState[data.memberId];
            return newState;
          });
        }, 3000);
      }
    });

    newSocket.on('group_deleted', (groupId: string) => {
      if (groupId === group.id) {
        alert('এই গ্রুপটি অ্যাডমিন দ্বারা ডিলেট করা হয়েছে।');
        onBack();
      }
    });

    newSocket.on('left_group_success', (groupId: string) => {
      if (groupId === group.id) {
        onBack();
      }
    });

    return () => {
      newSocket.close();
    };
  }, [group.id, userId, onBack]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || selectedImage) && socket) {
      socket.emit('send_group_message', {
        groupId: group.id,
        userId,
        userName: userName,
        content: input.trim(),
        imageUrl: selectedImage || undefined
      });
      setInput('');
      setSelectedImage(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    if (socket && group.adminId === userId) {
      if (window.confirm('আপনি কি নিশ্চিত যে আপনি এই মেম্বারকে রিমুভ করতে চান?')) {
        socket.emit('remove_member', {
          groupId: group.id,
          adminId: userId,
          memberId
        });
      }
    }
  };

  const handleDeleteGroup = () => {
    if (socket && group.adminId === userId) {
      if (window.confirm('আপনি কি নিশ্চিত যে আপনি এই গ্রুপটি স্থায়ীভাবে ডিলেট করতে চান? এই অ্যাকশনটি আর ফেরত নেওয়া যাবে না।')) {
        socket.emit('delete_group', {
          groupId: group.id,
          adminId: userId
        });
      }
    }
  };

  const handleAddMember = (memberId: string) => {
    if (socket && group.adminId === userId) {
      socket.emit('add_member', {
        groupId: group.id,
        adminId: userId,
        adminName: userName,
        memberId
      });
      setAddedMemberStatus(prev => ({ ...prev, [memberId]: 'সফল!' }));
      setTimeout(() => {
        setAddedMemberStatus(prev => {
          const newState = { ...prev };
          delete newState[memberId];
          return newState;
        });
      }, 3000);
    }
  };

  const handleLeaveGroup = () => {
    if (socket && window.confirm('আপনি কি নিশ্চিত যে আপনি এই গ্রুপটি ত্যাগ করতে চান?')) {
      socket.emit('leave_group', {
        groupId: group.id,
        userId
      });
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.inviteCode);
    alert('ইনভাইট কোড কপি করা হয়েছে!');
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?join=${group.inviteCode}`;
    navigator.clipboard.writeText(link);
    alert('ইনভাইট লিংক কপি করা হয়েছে!');
  };

  return (
    <div className="flex flex-col h-screen bg-rose-50 max-w-2xl mx-auto shadow-2xl relative">
      {/* Header */}
      <div className="bg-white p-4 flex items-center justify-between border-b border-rose-100 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-rose-50 rounded-full transition-colors text-rose-500"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="cursor-pointer" onClick={() => setShowMembers(true)}>
            <h1 className="text-xl font-bold text-rose-600 flex items-center gap-2">
              <Users className="w-5 h-5" />
              {group.name}
            </h1>
            <p className="text-[10px] text-rose-400">{group.members?.length || 1} মেম্বার • বিস্তারিত দেখুন</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {group.adminId === userId && (
            <button 
              onClick={() => setShowAddFriend(true)}
              className="p-2 bg-rose-100 text-rose-600 rounded-full hover:bg-rose-200 transition-colors"
              title="বন্ধু যুক্ত করুন"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => setShowInvite(true)}
            className="p-2 bg-rose-100 text-rose-600 rounded-full hover:bg-rose-200 transition-colors"
            title="ইনভাইট কোড"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-rose-50/50">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.userId === userId;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${isMe ? 'order-1' : 'order-2'}`}>
                  {!isMe && (
                    <span className="text-[10px] text-rose-400 ml-2 mb-1 block font-bold">
                      {msg.userName}
                    </span>
                  )}
                  <div className={`
                    px-4 py-2 rounded-2xl shadow-sm overflow-hidden
                    ${isMe 
                      ? 'bg-rose-500 text-white rounded-tr-none' 
                      : 'bg-white text-rose-800 rounded-tl-none border border-rose-100'}
                  `}>
                    {msg.imageUrl && (
                      <img 
                        src={msg.imageUrl} 
                        alt="Shared" 
                        className="w-full max-h-60 object-cover rounded-xl mb-2 border border-black/5" 
                        referrerPolicy="no-referrer"
                      />
                    )}
                    {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
                    <span className={`text-[9px] block mt-1 opacity-70 ${isMe ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="absolute bottom-20 left-4 right-4 bg-white p-2 rounded-2xl shadow-2xl border border-rose-100 z-20"
          >
            <div className="relative">
              <img src={selectedImage} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-rose-100 z-10">
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all"
          >
            <ImageIcon className="w-6 h-6" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            accept="image/*" 
            className="hidden" 
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="কিছু লিখুন..."
            className="flex-1 px-4 py-3 bg-rose-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-400 text-rose-800 placeholder-rose-300 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() && !selectedImage}
            className="p-3 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 disabled:opacity-50 disabled:hover:bg-rose-500 transition-all shadow-lg shadow-rose-200"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </form>

      {/* Members Modal */}
      <AnimatePresence>
        {showMembers && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-rose-600">গ্রুপ মেম্বারস</h2>
                <button onClick={() => setShowMembers(false)} className="p-2 hover:bg-rose-50 rounded-full">
                  <X className="w-5 h-5 text-rose-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3">
                {group.members?.map((mid) => (
                  <div key={mid} className="flex items-center justify-between p-3 bg-rose-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-200 rounded-full flex items-center justify-center text-rose-500">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-rose-800 text-sm">{mid}</p>
                        {mid === group.adminId && <span className="text-[10px] bg-rose-200 text-rose-700 px-2 py-0.5 rounded-full font-bold">অ্যাডমিন</span>}
                      </div>
                    </div>
                    {group.adminId === userId && mid !== userId && (
                      <div className="flex items-center gap-2">
                        {removedMemberStatus[mid] && (
                          <span className="text-[10px] text-rose-500 font-bold animate-pulse">
                            {removedMemberStatus[mid]}
                          </span>
                        )}
                        <button 
                          onClick={() => handleRemoveMember(mid)}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-full transition-all"
                          title="রিমুভ করুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {mid === userId && mid !== group.adminId && (
                      <button 
                        onClick={handleLeaveGroup}
                        className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-200 transition-all"
                      >
                        লিভ নিন
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {group.adminId === userId && (
                <div className="mt-4 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex flex-col gap-3">
                  <p className="text-[10px] text-rose-400 text-center">আপনি এই গ্রুপের অ্যাডমিন। আপনি চাইলে গ্রুপটি স্থায়ীভাবে ডিলেট করতে পারেন।</p>
                  <button 
                    onClick={handleDeleteGroup}
                    className="w-full py-2 bg-rose-100 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    গ্রুপ ডিলেট করুন
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Friend Modal */}
      <AnimatePresence>
        {showAddFriend && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-rose-600">বন্ধু যুক্ত করুন</h2>
                <button onClick={() => setShowAddFriend(false)} className="p-2 hover:bg-rose-50 rounded-full">
                  <X className="w-5 h-5 text-rose-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3">
                {friends.filter(f => !group.members?.includes(f)).length === 0 ? (
                  <p className="text-center text-rose-300 py-10">যুক্ত করার মতো কোন বন্ধু নেই।</p>
                ) : (
                  friends.filter(f => !group.members?.includes(f)).map((fid) => (
                    <div key={fid} className="flex items-center justify-between p-3 bg-rose-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-200 rounded-full flex items-center justify-center text-rose-500">
                          <User className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-rose-800 text-sm">{fid}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {addedMemberStatus[fid] && (
                          <span className="text-[10px] text-green-500 font-bold animate-bounce">
                            {addedMemberStatus[fid]}
                          </span>
                        )}
                        <button 
                          onClick={() => handleAddMember(fid)}
                          className="p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all"
                          title="যুক্ত করুন"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInvite && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6">
                <LinkIcon className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-rose-600 mb-2">ইনভাইট কোড</h2>
              <p className="text-sm text-rose-400 mb-6">এই কোডটি ব্যবহার করে আপনার বন্ধুরা গ্রুপে জয়েন করতে পারবে।</p>
              
              <div className="bg-rose-50 p-6 rounded-2xl border-2 border-dashed border-rose-200 mb-6">
                <span className="text-4xl font-mono font-bold text-rose-600 tracking-widest">{group.inviteCode}</span>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={copyInviteLink}
                  className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200 flex items-center justify-center gap-3 text-lg"
                >
                  <LinkIcon className="w-6 h-6" />
                  ইনভাইট লিংক কপি করুন
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={copyInviteCode}
                    className="flex-1 py-3 bg-rose-100 text-rose-600 rounded-xl font-bold hover:bg-rose-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    কোড কপি
                  </button>
                  <button 
                    onClick={() => setShowInvite(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupChat;
