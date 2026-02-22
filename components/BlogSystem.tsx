
import React, { useState, useEffect } from 'react';
import { createPost, subscribeToPosts, isFirebaseConfigured, sendFriendRequest, subscribeToIncomingFriendRequests, respondToFriendRequest, subscribeToFriends, subscribeToAllVisiblePosts, addReply, checkUserIdExists } from '../services/firebase';
import { Post, FriendRequest } from '../types';
import { Send, MessageCircle, Heart, AlertCircle, ArrowLeft, UserPlus, Users, Check, X, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BlogSystemProps {
  userId: string;
  onBack: () => void;
}

const BlogSystem: React.FC<BlogSystemProps> = ({ userId, onBack }) => {
  const [message, setMessage] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [friendIdInput, setFriendIdInput] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubFriends = subscribeToFriends(userId, setFriends);
    const unsubRequests = subscribeToIncomingFriendRequests(userId, setIncomingRequests);

    return () => {
      unsubFriends();
      unsubRequests();
    };
  }, [userId]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubscribe = subscribeToAllVisiblePosts(userId, friends, (updatedPosts) => {
      setPosts(updatedPosts);
    });
    return () => unsubscribe();
  }, [userId, friends]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (!isFirebaseConfigured) {
      alert('Firebase কনফিগারেশন করা নেই। দয়া করে API Key সেট করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      await createPost(userId, message);
      setMessage('');
    } catch (error) {
      alert('মেসেজ পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করো।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendFriendRequest = async () => {
    const targetId = friendIdInput.trim();
    if (!targetId) return;
    if (targetId === userId) {
      alert('নিজেকে ফ্রেন্ড রিকোয়েস্ট পাঠানো যাবে না!');
      return;
    }

    try {
      const exists = await checkUserIdExists(targetId);
      if (!exists) {
        alert('এই ইউজার আইডিটি খুঁজে পাওয়া যায়নি।');
        return;
      }

      await sendFriendRequest(userId, targetId);
      setFriendIdInput('');
      setIsAddingFriend(false);
      alert('ফ্রেন্ড রিকোয়েস্ট পাঠানো হয়েছে!');
    } catch (error) {
      alert('রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।');
    }
  };

  const handleRespondToRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await respondToFriendRequest(requestId, status);
    } catch (error) {
      alert('অ্যাকশন নিতে সমস্যা হয়েছে।');
    }
  };

  const handleReply = async (postId: string) => {
    const content = replyText[postId];
    if (!content?.trim()) return;

    try {
      await addReply(postId, content, false);
      setReplyText(prev => ({ ...prev, [postId]: '' }));
    } catch (error) {
      alert('রিপ্লাই দিতে সমস্যা হয়েছে।');
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-12 px-4">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-xl font-bold text-amber-800">Firebase কনফিগারেশন প্রয়োজন</h3>
          <p className="text-amber-700">
            অ্যাপটি সচল করতে দয়া করে AI Studio-র Environment Variables সেকশনে 
            <code className="bg-amber-100 px-2 py-1 rounded mx-1">VITE_FIREBASE_API_KEY</code> 
            সেট করুন।
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 px-4 pb-12">
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium transition-colors bg-white/50 px-4 py-2 rounded-full backdrop-blur-sm border border-rose-100"
        >
          <ArrowLeft className="w-4 h-4" />
          ফিরে যাও
        </button>

        <div className="flex gap-2">
          <button 
            onClick={() => setIsAddingFriend(!isAddingFriend)}
            className="flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium transition-colors bg-white/50 px-4 py-2 rounded-full backdrop-blur-sm border border-rose-100"
          >
            <UserPlus className="w-4 h-4" />
            ফ্রেন্ড অ্যাড করো
          </button>
        </div>
      </div>

      {isAddingFriend && (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-rose-100 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-rose-500" />
            ফ্রেন্ডের আইডি দিয়ে সার্চ করো
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={friendIdInput}
              onChange={(e) => setFriendIdInput(e.target.value)}
              placeholder="যেমন: sumi52"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-rose-50 focus:border-rose-400 outline-none transition-all"
            />
            <button
              onClick={handleSendFriendRequest}
              className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-rose-100"
            >
              রিকোয়েস্ট পাঠাও
            </button>
          </div>
        </div>
      )}

      {incomingRequests.length > 0 && (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-rose-100 mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-500" />
            ফ্রেন্ড রিকোয়েস্টসমূহ
          </h3>
          <div className="space-y-3">
            {incomingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                <div>
                  <p className="font-bold text-gray-800">{req.fromUserId}</p>
                  <p className="text-[10px] text-gray-400">{formatDistanceToNow(req.createdAt)} ago</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondToRequest(req.id, 'accepted')}
                    className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-all shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRespondToRequest(req.id, 'rejected')}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-all shadow-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-rose-100">
        <h2 className="text-2xl font-serif text-rose-600 mb-6 flex items-center gap-2">
          <MessageCircle className="w-6 h-6" />
          তোমার মনের কথা বলো
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="এখানে তোমার মেসেজ লেখো..."
            className="w-full px-4 py-3 rounded-2xl border-2 border-rose-100 focus:border-rose-400 outline-none transition-all min-h-[120px] resize-none"
          />
          <button
            type="submit"
            disabled={isSubmitting || !message.trim()}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'পাঠানো হচ্ছে...' : (
              <>
                <Send className="w-5 h-5" />
                মেসেজ পাঠাও
              </>
            )}
          </button>
        </form>

        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-700 border-b border-rose-100 pb-2">সাম্প্রতিক পোস্টসমূহ</h3>
          {posts.length === 0 ? (
            <p className="text-center text-gray-400 py-8 italic">এখনো কোনো পোস্ট নেই...</p>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">User: {post.userId}</span>
                  <span className="text-[10px] text-gray-400">{formatDistanceToNow(post.createdAt)} ago</span>
                </div>
                <p className="text-gray-800 leading-relaxed">{post.content}</p>
                
                {post.replies && post.replies.length > 0 && (
                  <div className="mt-4 space-y-3 pl-4 border-l-2 border-rose-200">
                    {post.replies.map((reply) => (
                      <div key={reply.id} className="bg-white/60 rounded-xl p-3 text-sm">
                        <div className="flex items-center gap-1 mb-1">
                          {reply.isAdmin && <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />}
                          <span className={`font-bold ${reply.isAdmin ? 'text-rose-600' : 'text-gray-600'}`}>
                            {reply.isAdmin ? 'Admin' : 'Reply'}
                          </span>
                        </div>
                        <p className="text-gray-700">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form for Friends' Posts */}
                {post.userId !== userId && (
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={replyText[post.id] || ''}
                      onChange={(e) => setReplyText(prev => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="রিপ্লাই লেখো..."
                      className="flex-1 px-3 py-2 rounded-xl border border-rose-100 focus:border-rose-400 outline-none text-xs transition-all bg-white"
                      onKeyPress={(e) => e.key === 'Enter' && handleReply(post.id)}
                    />
                    <button
                      onClick={() => handleReply(post.id)}
                      disabled={!replyText[post.id]?.trim()}
                      className="bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white p-2 rounded-xl transition-all shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogSystem;
