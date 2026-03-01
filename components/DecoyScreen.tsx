
import React from 'react';

interface DecoyScreenProps {
  onBack: () => void;
}

const DecoyScreen: React.FC<DecoyScreenProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-gray-900 relative z-10 text-center transition-colors duration-200">
      <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 animate-fade-in transition-colors duration-200">
        <div className="mb-8 text-6xl">⛔</div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-6 font-serif leading-tight">
          আপনি প্রিয়জন নন
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed italic">
          যার জন্য মেসেজ লেখা হয়েছে সে ঠিক ই দেখে নিবে...<br/>
          <span className="text-rose-500 dark:text-rose-400 font-semibold mt-4 block">আপনি বের হয়ে যান।</span>
        </p>
        
        <button
          onClick={onBack}
          className="px-8 py-3 bg-gray-800 dark:bg-gray-700 text-white rounded-xl hover:bg-black dark:hover:bg-gray-600 transition-colors text-lg"
        >
          ফিরে যাও
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default DecoyScreen;
