
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, X } from 'lucide-react';
import LockScreen from './components/LockScreen';
import DecoyScreen from './components/DecoyScreen';
import FloatingHearts from './components/FloatingHearts';
import AdminDashboard from './components/AdminDashboard';
import BlogSystem from './components/BlogSystem';
import RegistrationForm from './components/RegistrationForm';
import PasswordReset from './components/PasswordReset';
import GroupChat from './components/GroupChat';
import GroupList from './components/GroupList';
import { AppState, Group } from './types';
import { io } from 'socket.io-client';
import { Bell } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOCKED);
  const [userId, setUserId] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [groupNotification, setGroupNotification] = useState<{ groupName: string, fromUserName: string } | null>(null);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);

  useEffect(() => {
    // Check for invite link in URL
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('join');
    if (inviteCode) {
      setPendingInviteCode(inviteCode.toUpperCase());
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (userId && pendingInviteCode) {
      const socket = io();
      socket.emit('join_group_by_code', {
        userId,
        inviteCode: pendingInviteCode
      });
      
      socket.on('join_success', (group: Group) => {
        setSelectedGroup(group);
        setAppState(AppState.GROUP_CHAT);
        setPendingInviteCode(null);
        socket.close();
      });

      socket.on('join_error', (msg: string) => {
        alert(msg);
        setPendingInviteCode(null);
        socket.close();
      });
    }
  }, [userId, pendingInviteCode]);

  useEffect(() => {
    if (userId) {
      const socket = io();
      socket.on('group_invitation_notification', (data) => {
        if (data.toUserId === userId) {
          setGroupNotification({
            groupName: data.groupName,
            fromUserName: data.fromUserName
          });
          setTimeout(() => setGroupNotification(null), 5000);
        }
      });
      return () => {
        socket.close();
      };
    }
  }, [userId]);

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
      
      {/* Group Notification Toast */}
      <AnimatePresence>
        {groupNotification && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4"
          >
            <div className="bg-white border-2 border-rose-200 rounded-3xl p-4 shadow-2xl flex items-center gap-4">
              <div className="bg-rose-100 p-3 rounded-2xl text-rose-500">
                <Bell className="w-6 h-6 animate-swing" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-rose-600 text-sm">নতুন গ্রুপ ইনভাইট!</h4>
                <p className="text-xs text-rose-400">
                  আপনাকে <span className="font-bold text-rose-800"> "{groupNotification.groupName}"</span> গ্রুপে যুক্ত করা হয়েছে।
                </p>
              </div>
              <button 
                onClick={() => setGroupNotification(null)}
                className="p-2 hover:bg-rose-50 rounded-full text-rose-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
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
          <BlogSystem 
            userId={userId} 
            onBack={handleBackToLock} 
            onGoToChat={() => setAppState(AppState.GROUP_LIST)}
          />
        </div>
      )}

      {appState === AppState.GROUP_LIST && (
        <div className="animate-in fade-in duration-500">
          <GroupList 
            userId={userId} 
            onBack={() => setAppState(AppState.UNLOCKED)} 
            onSelectGroup={(group) => {
              setSelectedGroup(group);
              setAppState(AppState.GROUP_CHAT);
            }}
          />
        </div>
      )}

      {appState === AppState.GROUP_CHAT && selectedGroup && (
        <div className="animate-in fade-in duration-500">
          <GroupChat 
            userId={userId} 
            userName={localStorage.getItem('mitali_displayName') || userId}
            group={selectedGroup}
            friends={JSON.parse(localStorage.getItem('mitali_friends') || '[]')}
            onBack={() => setAppState(AppState.GROUP_LIST)} 
          />
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
        @keyframes swing {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
        }
        .animate-swing {
          animation: swing 1s ease-in-out infinite;
          transform-origin: top center;
        }
      `}</style>
    </div>
  );
};

export default App;
