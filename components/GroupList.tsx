
import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Plus, Users, ArrowLeft, Search, Link as LinkIcon, MessageSquare, Shield, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Group } from '../types';

interface GroupListProps {
  userId: string;
  onBack: () => void;
  onSelectGroup: (group: Group) => void;
}

const GroupList: React.FC<GroupListProps> = ({ userId, onBack, onSelectGroup }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupImage, setNewGroupImage] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const groupImageInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit('get_groups', userId);

    newSocket.on('groups_list', (list: Group[]) => {
      setGroups(list);
    });

    newSocket.on('group_created', (group: Group) => {
      setGroups(prev => [...prev, group]);
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupImage('');
    });

    newSocket.on('join_success', (group: Group) => {
      setGroups(prev => {
        if (prev.find(g => g.id === group.id)) return prev;
        return [...prev, group];
      });
      setShowJoinModal(false);
      setInviteCode('');
      onSelectGroup(group);
    });

    newSocket.on('join_error', (msg: string) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    newSocket.on('groups_updated', () => {
      newSocket.emit('get_groups', userId);
    });

    return () => {
      newSocket.close();
    };
  }, [userId]);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupName.trim() && socket) {
      socket.emit('create_group', {
        userId,
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        imageUrl: newGroupImage
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewGroupImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleJoinGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim() && socket) {
      socket.emit('join_group_by_code', {
        userId,
        inviteCode: inviteCode.trim().toUpperCase()
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-rose-50 max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="bg-white p-4 flex items-center justify-between border-b border-rose-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-rose-50 rounded-full transition-colors text-rose-500"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-rose-600">আমার গ্রুপসমূহ</h1>
            <p className="text-xs text-rose-400">আপনার আড্ডাঘরগুলো এখানে</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowJoinModal(true)}
            className="p-2 bg-rose-100 text-rose-600 rounded-full hover:bg-rose-200 transition-colors"
            title="লিংক দিয়ে জয়েন করুন"
          >
            <LinkIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200"
            title="নতুন গ্রুপ তৈরি করুন"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Group List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-rose-300 space-y-4">
            <Users className="w-16 h-16 opacity-20" />
            <p className="text-sm">কোন গ্রুপ পাওয়া যায়নি। নতুন গ্রুপ তৈরি করুন!</p>
          </div>
        ) : (
          groups.map((group) => (
            <motion.div
              key={group.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectGroup(group)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-rose-50 cursor-pointer flex items-center gap-4 hover:border-rose-200 transition-all"
            >
              <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-500 overflow-hidden border border-rose-100">
                {group.imageUrl ? (
                  <img src={group.imageUrl} alt={group.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Users className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-rose-800">{group.name}</h3>
                  {group.adminId === userId && <Shield className="w-3 h-3 text-rose-400" title="আপনি অ্যাডমিন" />}
                </div>
                <p className="text-xs text-rose-400 line-clamp-1">{group.description || 'কোন বর্ণনা নেই'}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-rose-50 text-rose-500 px-2 py-1 rounded-full">
                  {group.members?.length || 1} মেম্বার
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-rose-600 mb-4">নতুন গ্রুপ তৈরি করুন</h2>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="flex flex-col items-center gap-3 mb-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-rose-50 border-4 border-rose-100 flex items-center justify-center text-rose-300">
                      {newGroupImage ? (
                        <img src={newGroupImage} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Users className="w-12 h-12" />
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={() => groupImageInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-all"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input 
                      type="file" 
                      ref={groupImageInputRef} 
                      onChange={handleImageChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                  <p className="text-xs text-rose-400">গ্রুপ প্রোফাইল ছবি দিন</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-rose-400 uppercase mb-1">গ্রুপের নাম</label>
                  <input 
                    type="text" 
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="যেমন: বন্ধুদের সাথে গ্রুপ তৈরি করুন"
                    className="w-full px-4 py-3 bg-rose-50 rounded-xl border-none focus:ring-2 focus:ring-rose-400 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-rose-400 uppercase mb-1">বর্ণনা (ঐচ্ছিক)</label>
                  <textarea 
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="গ্রুপ সম্পর্কে কিছু লিখুন..."
                    className="w-full px-4 py-3 bg-rose-50 rounded-xl border-none focus:ring-2 focus:ring-rose-400 outline-none h-24 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    বাতিল
                  </button>
                  <button 
                    type="submit"
                    className="flex-2 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200"
                  >
                    তৈরি করুন
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Group Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-rose-600 mb-4">গ্রুপে জয়েন করুন</h2>
              <p className="text-sm text-rose-400 mb-4">আপনার কাছে থাকা ইনভাইট কোডটি এখানে দিন।</p>
              <form onSubmit={handleJoinGroup} className="space-y-4">
                <div>
                  <input 
                    type="text" 
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="ইনভাইট কোড (যেমন: ABC123)"
                    className="w-full px-4 py-3 bg-rose-50 rounded-xl border-none focus:ring-2 focus:ring-rose-400 outline-none text-center font-mono text-xl uppercase tracking-widest"
                    required
                  />
                </div>
                {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    বাতিল
                  </button>
                  <button 
                    type="submit"
                    className="flex-2 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200"
                  >
                    জয়েন করুন
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupList;
