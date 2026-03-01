
import React, { useState } from 'react';
import { Heart, Lock, Sparkles, User, Key } from 'lucide-react';
import { loginUser } from '../services/firebase';

interface LockScreenProps {
  onUnlock: (userId: string, isAdmin: boolean) => void;
  onDecoy: () => void;
  onRegister: () => void;
  onForgotPassword: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, onDecoy, onRegister, onForgotPassword }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);
  
  const ADMIN_IDS = ['rkb@93', 'loveadmin'];
  const DECOY_ID = 'temp80';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = userId.trim();
    const trimmedPass = password.trim();

    if (!trimmedId || !trimmedPass) {
      setError(true);
      setTimeout(() => setError(false), 2000);
      return;
    }

    if (trimmedId === DECOY_ID) {
      onDecoy();
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await loginUser(trimmedId, trimmedPass);
      if (success) {
        onUnlock(trimmedId, ADMIN_IDS.includes(trimmedId));
      } else {
        setError(true);
        setTimeout(() => setError(false), 2000);
      }
    } catch (err) {
      console.error("Login error:", err);
      alert('লগইন করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center p-6 bg-[#F0F2F5] dark:bg-gray-900 transition-colors duration-200">
      {/* Left Side - Branding */}
      <div className="lg:w-1/2 max-w-lg lg:pr-12 mb-10 lg:mb-0 text-center lg:text-left">
        <h1 className="text-6xl font-bold text-[#1D4ED8] dark:text-blue-500 mb-4">Mitali</h1>
        <p className="text-2xl text-gray-700 dark:text-gray-300 leading-tight">
          | বন্ধুত্ব হবে গোপনে | 
        </p>
      </div>

      {/* Right Side - Login Card */}
      <div className="w-full max-w-[400px]">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="ইউজার আইডি"
                className={`w-full px-4 py-3 rounded-md border outline-none transition-all text-lg dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                  error && !userId
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-300 dark:border-gray-600 focus:border-[#1D4ED8] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#1D4ED8] dark:focus:ring-blue-500'
                }`}
              />
            </div>

            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="পাসওয়ার্ড"
                className={`w-full px-4 py-3 rounded-md border outline-none transition-all text-lg dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                  error && !password
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-300 dark:border-gray-600 focus:border-[#1D4ED8] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#1D4ED8] dark:focus:ring-blue-500'
                }`}
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1D4ED8] hover:bg-[#1a44c2] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-all text-xl"
            >
              {isSubmitting ? 'লগইন হচ্ছে...' : 'লগ ইন'}
            </button>

            <div className="text-center">
              <button 
                type="button"
                onClick={onForgotPassword}
                className="text-sm text-[#1D4ED8] dark:text-blue-400 hover:underline"
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onRegister}
                className="bg-[#42B72A] hover:bg-[#36a420] dark:bg-green-600 dark:hover:bg-green-700 text-white font-bold py-3 px-6 rounded-md transition-all text-lg inline-block"
              >
                নতুন অ্যাকাউন্ট তৈরি করুন
              </button>
            </div>
          </form>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm text-center">
              ভুল আইডি বা পাসওয়ার্ড। আবার চেষ্টা করুন!
            </div>
          )}
        </div>
        
        <p className="mt-6 text-sm text-center text-gray-600 dark:text-gray-400">
          <b>| ভালবাসার বন্ধন | প্রিয়জনকে যুক্ত করুন | সীমাহীন উপভোগ করুন |</b>
        </p>
      </div>
    </div>
  );
};

export default LockScreen;
