
import React, { useState } from 'react';
import { registerUser, checkUserIdExists, checkMobileExists } from '../services/firebase';
import { ArrowLeft, User, Phone, Lock, Send, CheckCircle, X } from 'lucide-react';

interface RegistrationFormProps {
  onBack: () => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onBack }) => {
  const [formData, setFormData] = useState({
    userId: '',
    displayName: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [userIdError, setUserIdError] = useState(false);
  const [mobileError, setMobileError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { userId, displayName, mobile, password, confirmPassword } = formData;

    setUserIdError(false);
    setMobileError(false);

    if (!userId || !displayName || !mobile || !password || !confirmPassword) {
      alert('সবগুলো ঘর পূরণ করো!');
      return;
    }

    // Mobile number validation: 11 digits, English only
    const mobileRegex = /^\d{11}$/;
    if (!mobileRegex.test(mobile) || !/^\d+$/.test(mobile)) {
      alert('মোবাইল নাম্বার অবশ্যই ১১ সংখ্যার এবং ইংরেজিতে হতে হবে!');
      return;
    }

    if (password !== confirmPassword) {
      alert('পাসওয়ার্ড দুটি মিলছে না!');
      return;
    }

    if (password.length < 6) {
      alert('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে!');
      return;
    }

    setIsSubmitting(true);
    try {
      const idExists = await checkUserIdExists(userId);
      if (idExists) {
        setUserIdError(true);
        setIsSubmitting(false);
        return;
      }

      const mobileExists = await checkMobileExists(mobile);
      if (mobileExists) {
        setMobileError(true);
        setIsSubmitting(false);
        return;
      }

      await registerUser(userId, password, mobile, displayName);
      setIsSuccess(true);
    } catch (error) {
      alert('রেজিস্ট্রেশন করতে সমস্যা হয়েছে। আবার চেষ্টা করো।');
    } finally {
      setIsSubmitting(false);
    }
  };

    if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#fff5f5] dark:bg-gray-900">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-700 text-center max-w-md w-full">
          <div className="mb-6 inline-block p-4 bg-green-100 dark:bg-green-900/30 rounded-full text-green-500 dark:text-green-400">
            <CheckCircle className="w-16 h-16" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4 font-serif">রেজিস্ট্রেশন সফল হয়েছে!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            তোমার আইডি সফলভাবে তৈরি করা হয়েছে। এখন তুমি তোমার আইডি এবং পাসওয়ার্ড দিয়ে লগইন করতে পারবে।
          </p>
          <button
            onClick={onBack}
            className="w-full bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all"
          >
            লগইন পেজে ফিরে যাও
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F0F2F5] dark:bg-gray-900">
      <div className="w-full max-w-[432px] bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">সাইন আপ</h1>
              <p className="text-gray-600 dark:text-gray-400"> ইংরেজিতে নিজের মত করে একটি ইউজার আইডি দাও যা তোমার নাম হিসেবে ব্যবহার হবে। [ইউজার আইডি পরিবর্তনযোগ্য নয়]</p>
            </div>
            <button onClick={onBack} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="ডিসপ্লে নেম [যেমন: রাকিব হাসান]"
              className="w-full px-4 py-3 bg-[#F5F6F7] dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 outline-none focus:ring-1 focus:ring-[#1D4ED8] dark:focus:ring-blue-500 transition-all dark:text-white dark:placeholder-gray-400"
            />
          </div>

          <div className="space-y-1">
            <input
              type="text"
              value={formData.userId}
              onChange={(e) => {
                setFormData({ ...formData, userId: e.target.value });
                setUserIdError(false);
              }}
              placeholder="ইউজার আইডি [যেমন: rkb80]"
              className={`w-full px-4 py-3 bg-[#F5F6F7] dark:bg-gray-700 rounded-md border outline-none focus:ring-1 focus:ring-[#1D4ED8] dark:focus:ring-blue-500 transition-all dark:text-white dark:placeholder-gray-400 ${
                userIdError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {userIdError && (
              <p className="text-[11px] text-red-500 font-medium ml-1">
                পূর্বেই গ্রহণ আছে অন্যটি চেষ্টা করুন।
              </p>
            )}
          </div>

          <div className="space-y-1">
            <input
              type="tel"
              value={formData.mobile}
              onChange={(e) => {
                // Only allow English digits
                const value = e.target.value.replace(/\D/g, '');
                if (value.length <= 11) {
                  setFormData({ ...formData, mobile: value });
                  setMobileError(false);
                }
              }}
              placeholder="মোবাইল নাম্বার [যেমন: 01700000000]"
              className={`w-full px-4 py-3 bg-[#F5F6F7] dark:bg-gray-700 rounded-md border outline-none focus:ring-1 focus:ring-[#1D4ED8] dark:focus:ring-blue-500 transition-all dark:text-white dark:placeholder-gray-400 ${
                mobileError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {mobileError && (
              <p className="text-[11px] text-red-500 font-medium ml-1">
                পূর্বেই গ্রহণ আছে অন্যটি চেষ্টা করুন।
              </p>
            )}
          </div>

          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="নতুন পাসওয়ার্ড"
            className="w-full px-4 py-3 bg-[#F5F6F7] dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 outline-none focus:ring-1 focus:ring-[#1D4ED8] dark:focus:ring-blue-500 transition-all dark:text-white dark:placeholder-gray-400"
          />

          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="পাসওয়ার্ড পুনরায় দিন"
            className="w-full px-4 py-3 bg-[#F5F6F7] dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 outline-none focus:ring-1 focus:ring-[#1D4ED8] dark:focus:ring-blue-500 transition-all dark:text-white dark:placeholder-gray-400"
          />

          <div className="text-[11px] text-gray-600 dark:text-gray-400 leading-tight py-2">
            সাইন আপ এ ক্লিক করার মাধ্যমে, আপনি আমাদের শর্তাবলী, ডেটা পলিসি এবং কুকি পলিসির সাথে একমত হচ্ছেন। আপনি আমাদের কাছ থেকে SMS নোটিফিকেশন পেতে পারেন এবং যেকোনো সময় তা বন্ধ করতে পারেন।
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#00A400] hover:bg-[#008a00] dark:bg-green-600 dark:hover:bg-green-700 text-white font-bold py-2.5 rounded-md text-lg transition-all shadow-sm"
          >
            {isSubmitting ? 'প্রসেসিং...' : 'সাইন আপ'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <button onClick={onBack} className="text-[#1D4ED8] dark:text-blue-400 hover:underline text-sm">
            ইতিমধ্যেই অ্যাকাউন্ট আছে?
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;
