
import React, { useState } from 'react';
import { createRegistrationRequest } from '../services/firebase';
import { ArrowLeft, User, Phone, Mail, Send, CheckCircle } from 'lucide-react';

interface RegistrationFormProps {
  onBack: () => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onBack }) => {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile || !formData.email) {
      alert('সবগুলো ঘর পূরণ করো!');
      return;
    }

    setIsSubmitting(true);
    try {
      await createRegistrationRequest(formData.name, formData.mobile, formData.email);
      setIsSuccess(true);
    } catch (error) {
      alert('রেজিস্ট্রেশন করতে সমস্যা হয়েছে। আবার চেষ্টা করো।');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#fff5f5]">
        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white/50 text-center max-w-md w-full">
          <div className="mb-6 inline-block p-4 bg-green-100 rounded-full text-green-500">
            <CheckCircle className="w-16 h-16" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4 font-serif">আবেদন সফল হয়েছে!</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            তোমার রেজিস্ট্রেশন রিকোয়েস্ট অ্যাডমিন বরাবর পাঠানো হয়েছে। অ্যাডমিন তোমার মোবাইল নাম্বারে যোগাযোগ করে তোমাকে একটি ইউজার আইডি প্রদান করবেন।
          </p>
          <button
            onClick={onBack}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-all"
          >
            হোম পেজে ফিরে যাও
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#fff5f5] relative overflow-hidden">
      <div className="relative z-10 w-full max-w-md">
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium transition-colors bg-white/50 px-4 py-2 rounded-full backdrop-blur-sm border border-rose-100"
        >
          <ArrowLeft className="w-4 h-4" />
          ফিরে যাও
        </button>

        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2 font-serif">আইডি রেজিস্ট্রেশন</h1>
            <p className="text-gray-500 text-sm">নতুন আইডি পেতে নিচের তথ্যগুলো পূরণ করো</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">তোমার নাম</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-300" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="পুরো নাম লেখো"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-rose-50 focus:border-rose-400 outline-none transition-all bg-white/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">মোবাইল নাম্বার</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-300" />
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="যেমন: 017XXXXXXXX"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-rose-50 focus:border-rose-400 outline-none transition-all bg-white/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">ইমেইল অ্যাড্রেস</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-300" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="তোমার ইমেইল লেখো"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-rose-50 focus:border-rose-400 outline-none transition-all bg-white/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold py-5 rounded-2xl shadow-xl shadow-rose-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg mt-4"
            >
              {isSubmitting ? 'প্রসেসিং হচ্ছে...' : (
                <>
                  আবেদন করো
                  <Send className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;
