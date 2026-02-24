
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import LockScreen from './components/LockScreen';
import DecoyScreen from './components/DecoyScreen';
import FloatingHearts from './components/FloatingHearts';
import AdminDashboard from './components/AdminDashboard';
import BlogSystem from './components/BlogSystem';
import RegistrationForm from './components/RegistrationForm';
import PasswordReset from './components/PasswordReset';
import { AppState } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOCKED);
  const [userId, setUserId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const savedUserId = localStorage.getItem('mitali_userId');
    const savedAppState = localStorage.getItem('mitali_appState');
    
    if (savedUserId && savedAppState) {
      setUserId(savedUserId);
      setAppState(savedAppState as AppState);
    }
    setIsInitializing(false);
  }, []);

  const handleUnlock = (id: string, isAdmin: boolean) => {
    setUserId(id);
    setAppState(AppState.UNLOCKING);
    const finalState = isAdmin ? AppState.ADMIN_DASHBOARD : AppState.UNLOCKED;
    
    setTimeout(() => {
      setAppState(finalState);
      localStorage.setItem('mitali_userId', id);
      localStorage.setItem('mitali_appState', finalState);
    }, 800);
  };

  const handleBackToLock = () => {
    setAppState(AppState.LOCKED);
    localStorage.removeItem('mitali_userId');
    localStorage.removeItem('mitali_appState');
  };

  const handleGoToRegistration = () => {
    setAppState(AppState.REGISTRATION);
  };

  const handleGoToPasswordReset = () => {
    setAppState(AppState.PASSWORD_RESET);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <div className="text-6xl animate-pulse">❤️</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen transition-all duration-1000">
      <FloatingHearts />
      
      {appState === AppState.LOCKED && (
        <div className="animate-in fade-in duration-500">
          <LockScreen 
            onUnlock={handleUnlock} 
            onDecoy={() => setAppState(AppState.DECOY_REJECTED)} 
            onRegister={handleGoToRegistration}
            onForgotPassword={handleGoToPasswordReset}
          />
        </div>
      )}

      {appState === AppState.REGISTRATION && (
        <div className="animate-in fade-in duration-500">
          <RegistrationForm onBack={handleBackToLock} />
        </div>
      )}

      {appState === AppState.PASSWORD_RESET && (
        <div className="animate-in fade-in duration-500">
          <PasswordReset onBack={handleBackToLock} />
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
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="text-6xl animate-ping opacity-20">❤️</div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
              </div>
            </div>
          </div>
        </div>
      )}

      {appState === AppState.UNLOCKED && (
        <div className="animate-in slide-in-from-bottom duration-1000 ease-out fill-mode-forwards">
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
