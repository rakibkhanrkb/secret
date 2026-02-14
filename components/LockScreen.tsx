
import React, { useState } from 'react';

interface LockScreenProps {
  onUnlock: () => void;
  onDecoy: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, onDecoy }) => {
  const [inputId, setInputId] = useState('');
  const [error, setError] = useState(false);
  const VALID_IDS = ['auntora93', 'Auntora93', 'sumi52'];
  const DECOY_ID = 'songita80';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputId.trim();
    
    if (VALID_IDS.includes(trimmedInput)) {
      onUnlock();
    } else if (trimmedInput === DECOY_ID) {
      onDecoy();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-rose-50 relative z-10">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-rose-100 backdrop-blur-sm bg-opacity-90">
        <div className="mb-6 inline-block p-4 bg-rose-100 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-2 font-serif">শুধু মাত্র তোমার জন্য</h1>
        <p className="text-gray-500 mb-8 leading-relaxed px-4">মেসেজটি দেখতে তোমার নাম আর তোমার মোবাইল নাম্বার এর শেষ দুটি সংখ্যা লিখে আনলক করো</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder="এখানে লেখো (যেমন: songita80)"
              className={`w-full px-5 py-4 rounded-xl border-2 outline-none transition-all text-center placeholder:text-gray-300 ${
                error ? 'border-red-400 animate-shake' : 'border-rose-100 focus:border-rose-400'
              }`}
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-rose-200 transition-all active:scale-95"
          >
            আনলক করো
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-500 font-medium">ভুল আইডি। আবার চেষ্টা করো, প্রিয়!</p>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default LockScreen;
