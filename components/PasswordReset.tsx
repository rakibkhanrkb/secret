import React, { useState } from 'react';
import { resetUserPassword } from '../services/firebase';
import { ArrowLeft, Phone, Lock, CheckCircle, Send, X } from 'lucide-react';

interface PasswordResetProps {
  onBack: () => void;
}

const PasswordReset: React.FC<PasswordResetProps> = ({ onBack }) => {
  const [formData, setFormData] = useState({
    userId: '',
    mobile: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { userId, mobile, newPassword, confirmPassword } = formData;

    if (!userId || !mobile || !newPassword || !confirmPassword) {
      alert('সবগুলো ঘর পূরণ করো!');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('পাসওয়ার্ড দুটি মিলছে না!');
      return;
    }

    if (newPassword.length < 6) {
      alert('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে!');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await resetUserPassword(userId, mobile, newPassword);
      if (success) {
        setIsSuccess(true);
      } else {
        alert('ইউজার আইডি বা মোবাইল নাম্বারটি ভুল।');
      }
    } catch (error) {
      alert('পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে। আবার চেষ্টা করো।');
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
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4 font-serif">রিসেট সফল হয়েছে!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            তোমার পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে। এখন তুমি নতুন পাসওয়ার্ড দিয়ে লগইন করতে পারবে।
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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">আপনার অ্যাকাউন্ট এর পাসওয়ার্ড রিসেট করুন</h1>
            <button onClick={onBack} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">আপনার পাসওয়ার্ড রিসেট করতে আপনার ইউজার আইডি এবং মোবাইল নাম্বার দিন।</p>
          
          <input
            type="text"
            value={formData.userId}
            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
            placeholder="ইউজার আইডি"
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 outline-none focus:ring-1 focus:ring-[#1D4ED8] dark:focus:ring-blue-500 transition-all dark:text-white dark:placeholder-gray-400"
          />

          <input
            type="tel"
            value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            placeholder="মোবাইল নাম্বার"
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 outline-none focus:ring-1 focus:ring-[#1D4ED8] dark:focus:ring-blue-500 transition-all dark:text-white dark:placeholder-gray-400"
          />

          <input
            type="password"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            placeholder="নতুন পাসওয়ার্ড"
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 outline-none focus:ring-1 focus:ring-[#1D4ED8] dark:focus:ring-blue-500 transition-all dark:text-white dark:placeholder-gray-400"
          />

          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="পাসওয়ার্ড পুনরায় দিন"
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 outline-none focus:ring-1 focus:ring-[#1D4ED8] dark:focus:ring-blue-500 transition-all dark:text-white dark:placeholder-gray-400"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 mt-4">
            <button
              type="button"
              onClick={onBack}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold px-4 py-2 rounded-md transition-all"
            >
              বাতিল করুন
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#1D4ED8] hover:bg-[#1a44c2] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-md transition-all"
            >
              {isSubmitting ? 'প্রসেসিং...' : 'সেট করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordReset;
