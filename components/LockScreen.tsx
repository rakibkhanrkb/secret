
import React, { useState, useEffect } from 'react';
import { Heart, Lock, Sparkles } from 'lucide-react';
import { subscribeToApprovedUserIds } from '../services/firebase';

interface LockScreenProps {
  onUnlock: (userId: string, isAdmin: boolean) => void;
  onDecoy: () => void;
  onRegister: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, onDecoy, onRegister }) => {
  const [inputId, setInputId] = useState('');
  const [error, setError] = useState(false);
  const [approvedIds, setApprovedIds] = useState<string[]>([]);
  const VALID_IDS = ['auntora93', 'Auntora93', 'sumi52'];
  const ADMIN_IDS = ['rkb@93', 'loveadmin'];
  const DECOY_ID = 'temp80';

  useEffect(() => {
    const unsubscribe = subscribeToApprovedUserIds(setApprovedIds);
    return () => unsubscribe();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputId.trim();
    
    if (VALID_IDS.includes(trimmedInput) || approvedIds.includes(trimmedInput)) {
      onUnlock(trimmedInput, false);
    } else if (ADMIN_IDS.includes(trimmedInput)) {
      onUnlock(trimmedInput, true);
    } else if (trimmedInput === DECOY_ID) {
      onDecoy();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#fff5f5] relative overflow-hidden">
      {/* Floating Hearts Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float text-rose-200/40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
              fontSize: `${10 + Math.random() * 30}px`
            }}
          >
            <Heart fill="currentColor" />
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(255,182,193,0.3)] border border-white/50 text-center">
          <div className="mb-8 relative inline-block">
            <div className="p-5 bg-gradient-to-br from-rose-400 to-pink-500 rounded-3xl shadow-lg shadow-rose-200 animate-pulse">
              <Lock className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 bg-white p-1.5 rounded-full shadow-md">
              <Sparkles className="h-4 w-4 text-rose-400" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-800 mb-3 font-serif tracking-tight">
            মিতালি</h1>
          <h3 className="text-xl font-bold text-gray-800 mb-3 font-serif tracking-tight">
            <span className="text-rose-500">"তুমি আর আমি"</span>
          </h3>
          <p className="text-gray-500 mb-10 leading-relaxed px-2 text-sm font-medium">
            প্রিয়জন কে মেসেজ করতে বা দেখতে তোমার নাম আর তোমার মোবাইল নাম্বার এর শেষ দুটি সংখ্যা লিখে আনলক করো
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative group">
              <input
                type="text"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                placeholder="এখানে লেখো (যেমন: temp80)"
                className={`w-full px-6 py-5 rounded-2xl border-2 outline-none transition-all text-center text-lg font-medium placeholder:text-gray-300 bg-white/50 ${
                  error 
                    ? 'border-red-400 animate-shake bg-red-50/50' 
                    : 'border-rose-100 focus:border-rose-400 focus:bg-white shadow-sm'
                }`}
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold py-5 rounded-2xl shadow-xl shadow-rose-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
            >
              আনলক করো
              <Heart className="w-5 h-5 fill-white" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-rose-50">
            <p className="text-gray-400 text-sm mb-3">তোমার কি কোনো আইডি নেই?</p>
            <button
              onClick={onRegister}
              className="text-rose-500 font-bold hover:text-rose-600 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              নতুন আইডি রেজিস্ট্রেশন করো
              <Sparkles className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="mt-6 flex items-center justify-center gap-2 text-red-500 animate-bounce">
              <span className="text-sm font-bold">ভুল আইডি। আবার চেষ্টা করো, প্রিয়!</span>
            </div>
          )}
        </div>

        {/* Footer Text */}
        <p className="mt-8 text-center text-rose-300 text-xs font-bold tracking-widest uppercase">
          &copy; {new Date().getFullYear()} মিতালি - ভালোবাসার বন্ধন
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
          50% { transform: translateY(-100px) rotate(20deg); opacity: 0.8; }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
};

export default LockScreen;
