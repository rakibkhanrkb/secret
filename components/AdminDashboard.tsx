
import React, { useState, useEffect } from 'react';
import { subscribeToPosts, addReply, isFirebaseConfigured, deletePost, subscribeToRegistrationRequests, assignUserIdToRequest, subscribeToAllUserProfiles, subscribeToAllUserAccounts, updateUserAccount, deleteUserAccount, deleteReply } from '../services/firebase';
import { Post, RegistrationRequest, UserProfile, UserAccount, Reply } from '../types';
import { Shield, Reply as ReplyIcon, Send, Heart, ArrowLeft, AlertCircle, Trash2, Users, MessageSquare, Search, UserPlus, Check, Phone, Mail, User, Edit, Key, Lock, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AdminDashboardProps {
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [allProfiles, setAllProfiles] = useState<{ [userId: string]: UserProfile }>({});
  const [activeTab, setActiveTab] = useState<'posts' | 'requests' | 'users'>('posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<{ [key: string]: boolean }>({});
  const [assigningUserId, setAssigningUserId] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubscribePosts = subscribeToPosts(setPosts);
    const unsubscribeRequests = subscribeToRegistrationRequests(setRequests);
    const unsubscribeProfiles = subscribeToAllUserProfiles(setAllProfiles);
    const unsubscribeAccounts = subscribeToAllUserAccounts(setUserAccounts);
    return () => {
      unsubscribePosts();
      unsubscribeRequests();
      unsubscribeProfiles();
      unsubscribeAccounts();
    };
  }, []);

  const handleReply = async (postId: string) => {
    const content = replyText[postId];
    if (!content?.trim()) return;

    if (!isFirebaseConfigured) {
      alert('Firebase কনফিগারেশন করা নেই।');
      return;
    }

    setIsSubmitting(prev => ({ ...prev, [postId]: true }));
    try {
      await addReply(postId, 'Admin', content, true);
      setReplyText(prev => ({ ...prev, [postId]: '' }));
    } catch (error) {
      alert('রিপ্লাই দিতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleDelete = async (postId: string) => {
    console.log("Attempting to delete post:", postId);
    if (window.confirm('তুমি কি নিশ্চিত যে তুমি এই পোস্টটি ডিলিট করতে চাও?')) {
      try {
        await deletePost(postId);
        console.log("Post deleted successfully:", postId);
      } catch (error) {
        console.error("Failed to delete post:", error);
        alert('পোস্ট ডিলিট করতে সমস্যা হয়েছে।');
      }
    }
  };

  const handleAssignId = async (requestId: string) => {
    const userId = assigningUserId[requestId];
    if (!userId?.trim()) return;

    try {
      await assignUserIdToRequest(requestId, userId);
      setAssigningUserId(prev => ({ ...prev, [requestId]: '' }));
      alert('ইউজার আইডি সফলভাবে এসাইন করা হয়েছে!');
    } catch (error) {
      alert('আইডি এসাইন করতে সমস্যা হয়েছে।');
    }
  };

  const handleDeleteReply = async (postId: string, reply: Reply) => {
    if (window.confirm('তুমি কি নিশ্চিত যে তুমি এই কমেন্টটি ডিলিট করতে চাও?')) {
      try {
        await deleteReply(postId, reply);
      } catch (error) {
        alert('কমেন্ট ডিলিট করতে সমস্যা হয়েছে।');
      }
    }
  };

  const filteredRequests = requests.filter(req => 
    req.mobile.includes(searchQuery) || req.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-rose-100 space-y-6">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-800">অ্যাডমিন প্যানেল নিষ্ক্রিয়</h2>
          <p className="text-gray-600">
            Firebase কনফিগারেশন সম্পন্ন না হওয়া পর্যন্ত অ্যাডমিন প্যানেল ব্যবহার করা যাবে না।
          </p>
          <button 
            onClick={onBack}
            className="w-full bg-rose-500 text-white py-3 rounded-xl font-bold hover:bg-rose-600 transition-colors"
          >
            ফিরে যাও
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rose-50 dark:bg-gray-900 p-6 pt-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            ফিরে যাও
          </button>
          <div className="flex items-center gap-2 bg-rose-100 dark:bg-rose-900/30 px-4 py-2 rounded-full text-rose-700 dark:text-rose-300 font-bold">
            <Shield className="w-5 h-5" />
            Admin Panel
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-rose-100 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'posts' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-none' : 'text-gray-500 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-gray-700'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            পোস্টসমূহ
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'requests' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-none' : 'text-gray-500 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-gray-700'
            }`}
          >
            <Users className="w-5 h-5" />
            রেজিস্ট্রেশন রিকোয়েস্ট
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <span className="bg-white text-rose-500 text-[10px] px-2 py-0.5 rounded-full">
                {requests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'users' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-none' : 'text-gray-500 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-gray-700'
            }`}
          >
            <User className="w-5 h-5" />
            ইউজার তথ্য
          </button>
        </div>

        <div className="space-y-8">
          {activeTab === 'posts' ? (
            posts.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-rose-100 dark:border-gray-700">
                <p className="text-gray-400 italic">কোনো পোস্ট পাওয়া যায়নি...</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-rose-100 dark:border-gray-700 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-rose-100 dark:border-gray-600 bg-rose-50 dark:bg-gray-700 flex items-center justify-center">
                        {allProfiles[post.userId]?.profileImageUrl ? (
                          <img 
                            src={allProfiles[post.userId].profileImageUrl} 
                            alt={post.userId} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <User className="w-5 h-5 text-rose-200 dark:text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 dark:text-white">{post.userId}</h3>
                        <p className="text-xs text-gray-400">{formatDistanceToNow(post.createdAt)} ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(post.id);
                        }}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all p-2 rounded-lg group"
                        title="Delete Post"
                      >
                        <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </button>
                      <Heart className="w-5 h-5 text-rose-200 dark:text-gray-600" />
                    </div>
                  </div>

                  <p className="text-gray-700 dark:text-gray-300 text-lg mb-6 leading-relaxed bg-rose-50/30 dark:bg-gray-700/30 p-4 rounded-2xl">
                    {post.content}
                  </p>

                  {post.imageUrl && (
                    <div className="mb-6 rounded-2xl overflow-hidden border border-rose-100 dark:border-gray-700 shadow-sm">
                      <img 
                        src={post.imageUrl} 
                        alt="Post content" 
                        className="w-full h-auto max-h-[300px] object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Replies Section */}
                  {post.replies && post.replies.length > 0 && (
                    <div className="mb-6 space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Replies</h4>
                      {post.replies.map((reply) => (
                        <div key={reply.id} className={`p-3 rounded-2xl text-sm relative group/reply ${reply.isAdmin ? 'bg-rose-100/50 dark:bg-rose-900/20 ml-6' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${reply.isAdmin ? 'text-rose-600 dark:text-rose-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                {reply.isAdmin ? 'Admin' : (reply.userId || 'User')}
                              </span>
                              <span className="text-[10px] text-gray-400">{formatDistanceToNow(reply.createdAt)} ago</span>
                            </div>
                            <button 
                              onClick={() => handleDeleteReply(post.id, reply)}
                              className="opacity-0 group-hover/reply:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                              title="Delete Comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Form */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyText[post.id] || ''}
                      onChange={(e) => setReplyText(prev => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="রিপ্লাই লেখো..."
                      className="flex-1 px-4 py-2 rounded-xl border border-rose-100 dark:border-gray-600 focus:border-rose-400 dark:focus:border-rose-500 outline-none text-sm transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      onKeyPress={(e) => e.key === 'Enter' && handleReply(post.id)}
                    />
                    <button
                      onClick={() => handleReply(post.id)}
                      disabled={isSubmitting[post.id] || !replyText[post.id]?.trim()}
                      className="bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 dark:disabled:bg-rose-800 text-white p-2 rounded-xl transition-all"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )
          ) : activeTab === 'requests' ? (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="মোবাইল নাম্বার বা নাম দিয়ে সার্চ করো..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-rose-100 dark:border-gray-700 focus:border-rose-400 outline-none transition-all bg-white dark:bg-gray-800 dark:text-white shadow-sm"
                />
              </div>

              {filteredRequests.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-rose-100 dark:border-gray-700">
                  <p className="text-gray-400 italic">কোনো রিকোয়েস্ট পাওয়া যায়নি...</p>
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div key={req.id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-rose-100 dark:border-gray-700 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${req.status === 'approved' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-gray-800 dark:text-white text-xl">{req.name}</h3>
                        <div className="flex gap-4 mt-1">
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {req.mobile}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {req.email}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                        req.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="bg-rose-50/30 dark:bg-gray-700/30 p-4 rounded-2xl mt-4">
                      {req.status === 'approved' ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold">
                            <Check className="w-5 h-5" />
                            Assigned ID: <span className="text-gray-800 dark:text-white">{req.assignedUserId}</span>
                          </div>
                          <p className="text-[10px] text-gray-400">{formatDistanceToNow(req.createdAt)} ago</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium italic">নতুন ইউজার আইডি এসাইন করো:</p>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300" />
                              <input
                                type="text"
                                value={assigningUserId[req.id] || ''}
                                onChange={(e) => setAssigningUserId(prev => ({ ...prev, [req.id]: e.target.value }))}
                                placeholder="যেমন: sumi52"
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-rose-100 dark:border-gray-600 focus:border-rose-400 outline-none text-sm transition-all bg-white dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                            <button
                              onClick={() => handleAssignId(req.id)}
                              disabled={!assigningUserId[req.id]?.trim()}
                              className="bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 dark:disabled:bg-rose-800 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-md shadow-rose-100 dark:shadow-none flex items-center gap-2"
                            >
                              Assign ID
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ইউজার আইডি বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-rose-100 dark:border-gray-700 focus:border-rose-400 outline-none transition-all bg-white dark:bg-gray-800 dark:text-white shadow-sm"
                />
              </div>

              <div className="grid gap-4">
                {userAccounts
                  .filter(acc => 
                    (acc.userId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (acc.mobile || '').includes(searchQuery)
                  )
                  .map((acc) => (
                    <div key={acc.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-rose-100 dark:border-gray-700 hover:shadow-2xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-gray-700 flex items-center justify-center text-rose-500 font-bold text-2xl border border-rose-100 dark:border-gray-600">
                          {(acc.userId || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 dark:text-white text-xl">{acc.userId}</span>
                            <span className="text-[10px] bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">User</span>
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                              <Phone className="w-4 h-4 text-rose-400" />
                              <span className="font-medium">{acc.mobile}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                              <Lock className="w-4 h-4 text-rose-400" />
                              <span className="font-mono bg-rose-50 dark:bg-gray-700 px-2 py-0.5 rounded border border-rose-100 dark:border-gray-600 text-rose-700 dark:text-rose-300">{acc.password}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setEditingAccount(acc)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 dark:bg-gray-700 text-rose-600 dark:text-rose-300 rounded-xl font-bold hover:bg-rose-100 dark:hover:bg-gray-600 transition-colors border border-rose-100 dark:border-gray-600"
                        >
                          <Edit className="w-4 h-4" />
                          এডিট
                        </button>
                        <button 
                          onClick={async () => {
                            if (window.confirm(`${acc.userId} কে ডিলিট করতে চান?`)) {
                              try {
                                await deleteUserAccount(acc.id, acc.userId);
                                alert('ইউজার ডিলিট হয়েছে।');
                              } catch (e) {
                                alert('ডিলিট করতে সমস্যা হয়েছে।');
                              }
                            }
                          }}
                          className="p-2.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                {userAccounts.length === 0 && (
                  <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-rose-100 dark:border-gray-700">
                    <Users className="w-20 h-20 text-rose-100 dark:text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-400 font-bold text-xl">কোনো ইউজার পাওয়া যায়নি</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden border border-rose-100 dark:border-gray-700">
            <div className="p-8 border-b border-rose-50 dark:border-gray-700 flex justify-between items-center bg-rose-50/50 dark:bg-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500 rounded-xl text-white">
                  <Edit className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">ইউজার তথ্য পরিবর্তন</h3>
              </div>
              <button 
                onClick={() => setEditingAccount(null)} 
                className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-xl transition-colors text-gray-400 hover:text-rose-500 shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const userId = formData.get('userId') as string;
                const mobile = formData.get('mobile') as string;
                const password = formData.get('password') as string;

                try {
                  await updateUserAccount(editingAccount.id, editingAccount.userId, { userId, mobile, password });
                  alert('তথ্য আপডেট হয়েছে।');
                  setEditingAccount(null);
                } catch (err) {
                  alert('আপডেট করতে সমস্যা হয়েছে।');
                }
              }}
              className="p-8 space-y-6"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-rose-400 uppercase ml-1 tracking-widest">ইউজার আইডি</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-300 w-5 h-5" />
                  <input 
                    name="userId"
                    defaultValue={editingAccount.userId}
                    className="w-full pl-12 pr-4 py-4 bg-rose-50/50 dark:bg-gray-700 border-2 border-transparent focus:border-rose-200 dark:focus:border-rose-500 rounded-2xl outline-none transition-all font-bold text-gray-800 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-rose-400 uppercase ml-1 tracking-widest">মোবাইল নম্বর</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-300 w-5 h-5" />
                  <input 
                    name="mobile"
                    defaultValue={editingAccount.mobile}
                    className="w-full pl-12 pr-4 py-4 bg-rose-50/50 dark:bg-gray-700 border-2 border-transparent focus:border-rose-200 dark:focus:border-rose-500 rounded-2xl outline-none transition-all font-bold text-gray-800 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-rose-400 uppercase ml-1 tracking-widest">পাসওয়ার্ড</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-300 w-5 h-5" />
                  <input 
                    name="password"
                    defaultValue={editingAccount.password}
                    className="w-full pl-12 pr-4 py-4 bg-rose-50/50 dark:bg-gray-700 border-2 border-transparent focus:border-rose-200 dark:focus:border-rose-500 rounded-2xl outline-none transition-all font-bold text-gray-800 dark:text-white"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-600 hover:scale-[1.02] active:scale-95 transition-all mt-4"
              >
                তথ্য সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
