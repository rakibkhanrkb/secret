
import React, { useState, useEffect } from 'react';
import { createPost, subscribeToPosts, isFirebaseConfigured } from '../services/firebase';
import { Post } from '../types';
import { Send, MessageCircle, Heart, AlertCircle, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BlogSystemProps {
  userId: string;
  onBack: () => void;
}

const BlogSystem: React.FC<BlogSystemProps> = ({ userId, onBack }) => {
  const [message, setMessage] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubscribe = subscribeToPosts((updatedPosts) => {
      setPosts(updatedPosts);
    }, userId);
    return () => unsubscribe();
  }, [userId]);

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
      <button 
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium transition-colors bg-white/50 px-4 py-2 rounded-full backdrop-blur-sm border border-rose-100"
      >
        <ArrowLeft className="w-4 h-4" />
        ফিরে যাও
      </button>

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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogSystem;
