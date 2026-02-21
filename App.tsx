
import React, { useState } from 'react';
import LockScreen from './components/LockScreen';
import DecoyScreen from './components/DecoyScreen';
import FloatingHearts from './components/FloatingHearts';
import AdminDashboard from './components/AdminDashboard';
import BlogSystem from './components/BlogSystem';
import { AppState } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOCKED);
  const [userId, setUserId] = useState<string>('');

  const handleUnlock = (id: string, isAdmin: boolean) => {
    setUserId(id);
    setAppState(AppState.UNLOCKING);
    setTimeout(() => {
      setAppState(isAdmin ? AppState.ADMIN_DASHBOARD : AppState.UNLOCKED);
    }, 800);
  };

  const handleDecoyRejection = () => {
    setAppState(AppState.DECOY_REJECTED);
  };

  const handleBackToLock = () => {
    setAppState(AppState.LOCKED);
  };

  return (
    <div className="relative min-h-screen transition-all duration-1000">
      <FloatingHearts />
      
      {appState === AppState.LOCKED && (
        <div className="animate-in fade-in duration-500">
          <LockScreen onUnlock={handleUnlock} onDecoy={handleDecoyRejection} />
        </div>
      )}

      {appState === AppState.DECOY_REJECTED && (
        <div className="animate-in fade-in duration-500">
          <DecoyScreen onBack={handleBackToLock} />
        </div>
      )}

      {appState === AppState.ADMIN_DASHBOARD && (
        <div className="animate-in fade-in duration-500">
          <AdminDashboard onBack={handleBackToLock} />
        </div>
      )}

      {appState === AppState.UNLOCKING && (
        <div className="min-h-screen flex items-center justify-center bg-rose-50">
          <div className="text-center space-y-4">
            <div className="text-6xl animate-ping">❤️</div>
            <h2 className="text-2xl font-serif text-rose-500 animate-pulse">সারপ্রাইজটি আনলক হচ্ছে...</h2>
          </div>
        </div>
      )}

      {appState === AppState.UNLOCKED && (
        <div className="animate-in slide-in-from-bottom duration-1000 ease-out fill-mode-forwards pt-20">
          <BlogSystem userId={userId} onBack={handleBackToLock} />
        </div>
      )}

      <style>{`
        .animate-in {
          animation-fill-mode: forwards;
        }
        .fade-in {
          animation: fadeIn 0.5s ease-in;
        }
        .slide-in-from-bottom {
          animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100vh); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default App;
