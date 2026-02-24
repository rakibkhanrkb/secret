
import React, { useState, useEffect, useRef } from 'react';
import { createPost, subscribeToPosts, isFirebaseConfigured, sendFriendRequest, subscribeToIncomingFriendRequests, subscribeToSentFriendRequests, respondToFriendRequest, subscribeToFriends, subscribeToAllVisiblePosts, addReply, checkUserIdExists, unfriend, subscribeToNotifications, markNotificationAsRead, deleteNotification, subscribeToUnreadMessageCounts, subscribeToUserProfile, updateUserProfile, subscribeToAllUserProfiles, toggleReaction, removeReaction, subscribeToAllUserIds } from '../services/firebase';
import { Post, FriendRequest, Notification, UserProfile } from '../types';
import { Send, MessageCircle, Heart, AlertCircle, ArrowLeft, UserPlus, Users, Check, X, Search, Bell, UserMinus, MessageSquare, Image as ImageIcon, Trash2, Camera, User, Home, Video, ShoppingBag, Menu, LogOut, MoreHorizontal, ThumbsUp, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ChatWindow from './ChatWindow';

interface BlogSystemProps {
  userId: string;
  onBack: () => void;
}

const BlogSystem: React.FC<BlogSystemProps> = ({ userId, onBack }) => {
  const [message, setMessage] = useState('');
  const [headerSearchInput, setHeaderSearchInput] = useState('');
  const [headerSearchResults, setHeaderSearchResults] = useState<string[]>([]);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileFriends, setShowMobileFriends] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [friendIdInput, setFriendIdInput] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [allUserIds, setAllUserIds] = useState<string[]>([]);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeChatFriend, setActiveChatFriend] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<{ [friendId: string]: number }>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<{ [userId: string]: UserProfile }>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    bio: '',
    location: '',
    birthDate: '',
    gender: ''
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubFriends = subscribeToFriends(userId, setFriends);
    const unsubRequests = subscribeToIncomingFriendRequests(userId, setIncomingRequests);
    const unsubSentRequests = subscribeToSentFriendRequests(userId, setSentRequests);
    const unsubNotifications = subscribeToNotifications(userId, setNotifications);
    const unsubUnread = subscribeToUnreadMessageCounts(userId, setUnreadCounts);
    const unsubProfile = subscribeToUserProfile(userId, setUserProfile);
    const unsubAllProfiles = subscribeToAllUserProfiles(setAllProfiles);
    const unsubAllUserIds = subscribeToAllUserIds(setAllUserIds);

    if (userProfile) {
      setProfileFormData({
        bio: userProfile.bio || '',
        location: userProfile.location || '',
        birthDate: userProfile.birthDate || '',
        gender: userProfile.gender || ''
      });
    }

    return () => {
      unsubFriends();
      unsubRequests();
      unsubSentRequests();
      unsubNotifications();
      unsubUnread();
      unsubProfile();
      unsubAllProfiles();
      unsubAllUserIds();
    };
  }, [userId]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubscribe = subscribeToAllVisiblePosts(userId, friends, (updatedPosts) => {
      setPosts(updatedPosts);
    });
    return () => unsubscribe();
  }, [userId, friends]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (!isFirebaseConfigured) {
      alert('Firebase কনফিগারেশন করা নেই। দয়া করে API Key সেট করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      await createPost(userId, message, selectedImage || undefined);
      setMessage('');
      setSelectedImage(null);
      setIsCreatingPost(false);
    } catch (error) {
      alert('মেসেজ পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করো।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for base64
        alert('ছবিটি ১ মেগাবাইটের চেয়ে বড়। ছোট ছবি ব্যবহার করো।');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (userProfile) {
      setProfileFormData({
        bio: userProfile.bio || '',
        location: userProfile.location || '',
        birthDate: userProfile.birthDate || '',
        gender: userProfile.gender || ''
      });
    }
  }, [userProfile]);

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit for profile pic
        alert('প্রোফাইল ছবিটি ৫০০ কেবির চেয়ে বড়। ছোট ছবি ব্যবহার করো।');
        return;
      }
      setIsUpdatingProfile(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          await updateUserProfile(userId, { profileImageUrl: reader.result as string });
        } catch (error) {
          alert('প্রোফাইল ছবি আপডেট করতে সমস্যা হয়েছে।');
        } finally {
          setIsUpdatingProfile(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (friendIdInput.trim().length >= 1) {
      const filtered = allUserIds.filter(id => 
        id.toLowerCase().includes(friendIdInput.toLowerCase()) && 
        id !== userId && 
        !friends.includes(id)
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [friendIdInput, allUserIds, userId, friends]);

  useEffect(() => {
    if (headerSearchInput.trim().length >= 1) {
      const filtered = allUserIds.filter(id => 
        id.toLowerCase().includes(headerSearchInput.toLowerCase()) && 
        id !== userId && 
        !friends.includes(id)
      );
      setHeaderSearchResults(filtered);
    } else {
      setHeaderSearchResults([]);
    }
  }, [headerSearchInput, allUserIds, userId, friends]);

  const handleSendFriendRequest = async () => {
    const targetId = friendIdInput.trim();
    if (!targetId) return;
    if (targetId === userId) {
      alert('নিজেকে ফ্রেন্ড রিকোয়েস্ট পাঠানো যাবে না!');
      return;
    }

    try {
      const exists = await checkUserIdExists(targetId);
      if (!exists) {
        alert('এই ইউজার আইডিটি খুঁজে পাওয়া যায়নি।');
        return;
      }

      await sendFriendRequest(userId, targetId);
      setFriendIdInput('');
      setIsAddingFriend(false);
      alert('ফ্রেন্ড রিকোয়েস্ট পাঠানো হয়েছে!');
    } catch (error) {
      alert('রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।');
    }
  };

  const handleRespondToRequest = async (requestId: string, status: 'accepted' | 'rejected', fromUserId: string) => {
    try {
      await respondToFriendRequest(requestId, status, fromUserId, userId);
    } catch (error) {
      alert('অ্যাকশন নিতে সমস্যা হয়েছে।');
    }
  };

  const handleUnfriend = async (friendId: string) => {
    if (window.confirm(`${friendId} কে আনফ্রেন্ড করতে চাও?`)) {
      try {
        await unfriend(userId, friendId);
        alert('আনফ্রেন্ড করা হয়েছে।');
      } catch (error) {
        alert('আনফ্রেন্ড করতে সমস্যা হয়েছে।');
      }
    }
  };

  const handleSendFriendRequestTo = async (toId: string) => {
    try {
      await sendFriendRequest(userId, toId);
      alert('ফ্রেন্ড রিকোয়েস্ট পাঠানো হয়েছে!');
      setFriendIdInput('');
    } catch (error) {
      alert('রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      await updateUserProfile(userId, profileFormData);
      setIsEditingProfile(false);
      alert('প্রোফাইল আপডেট সফল হয়েছে!');
    } catch (error) {
      alert('প্রোফাইল আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleReply = async (postId: string) => {
    const content = replyText[postId];
    if (!content?.trim()) return;

    try {
      await addReply(postId, content, false);
      setReplyText(prev => ({ ...prev, [postId]: '' }));
    } catch (error) {
      alert('রিপ্লাই দিতে সমস্যা হয়েছে।');
    }
  };

  const handleToggleReaction = async (postId: string, reactionType: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      const currentReaction = post?.reactions?.[userId];

      if (currentReaction === reactionType) {
        await removeReaction(postId, userId);
      } else {
        await toggleReaction(postId, userId, reactionType);
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  const getReactionEmoji = (type: string) => {
    switch (type) {
      case 'like': return '👍';
      case 'love': return '❤️';
      case 'haha': return '😂';
      case 'sad': return '😢';
      case 'angry': return '😡';
      default: return '👍';
    }
  };

  const getReactionLabel = (type: string) => {
    switch (type) {
      case 'like': return 'লাইক';
      case 'love': return 'লাভ';
      case 'haha': return 'হাসি';
      case 'sad': return 'কান্না';
      case 'angry': return 'রাগ';
      default: return 'লাইক';
    }
  };

  const getReactionColor = (type: string) => {
    switch (type) {
      case 'like': return 'text-[#1D4ED8]';
      case 'love': return 'text-red-500';
      case 'haha': return 'text-yellow-500';
      case 'sad': return 'text-yellow-500';
      case 'angry': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const reactionOptions = [
    { type: 'like', emoji: '👍', label: 'লাইক' },
    { type: 'love', emoji: '❤️', label: 'লাভ' },
    { type: 'haha', emoji: '😂', label: 'হাসি' },
    { type: 'sad', emoji: '😢', label: 'কান্না' },
    { type: 'angry', emoji: '😡', label: 'রাগ' },
  ];

  if (!isFirebaseConfigured) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-12 px-4">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-xl font-bold text-amber-800">Firebase কনফিগারেশন প্রয়োজন</h3>
          <p className="text-amber-700">
            অ্যাপটি সচল করতে দয়া করে AI Studio-র Environment Variables সেকশনে 
            <code className="bg-amber-100 px-2 py-1 rounded mx-1">VITE_FIREBASE_API_KEY</code> 
            সেট করুন।
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
      {/* Facebook Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {!showMobileSearch && <div className="text-[#1D4ED8] font-bold text-4xl tracking-tighter">Mitali</div>}
          
          {/* Desktop Search */}
          <div className="relative ml-2 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="মিতালি খুঁজুন" 
              value={headerSearchInput}
              onChange={(e) => setHeaderSearchInput(e.target.value)}
              className="bg-[#F0F2F5] pl-10 pr-4 py-2 rounded-full text-sm outline-none w-60 focus:ring-1 focus:ring-gray-300"
            />
            {headerSearchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white shadow-2xl rounded-xl border border-gray-200 overflow-hidden z-[100]">
                <div className="p-2 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <span className="text-xs font-bold text-gray-500 px-2">সার্চ রেজাল্ট</span>
                  <button onClick={() => setHeaderSearchInput('')} className="p-1 hover:bg-gray-200 rounded-full">
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {headerSearchResults.map((resId) => (
                    <div key={resId} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                          {allProfiles[resId]?.profileImageUrl ? (
                            <img src={allProfiles[resId].profileImageUrl} alt={resId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 text-sm">{resId}</span>
                          {allProfiles[resId]?.location && (
                            <span className="text-[10px] text-gray-500">{allProfiles[resId].location}</span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleSendFriendRequestTo(resId)}
                        disabled={sentRequests.some(r => r.toUserId === resId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sentRequests.some(r => r.toUserId === resId) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-[#1D4ED8] text-white hover:bg-[#1a44c2]'}`}
                      >
                        {sentRequests.some(r => r.toUserId === resId) ? 'রিকোয়েস্ট সেন্ড' : 'রিকোয়েস্ট'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Search Toggle */}
          <div className="md:hidden flex items-center">
            {showMobileSearch ? (
              <div className="flex items-center gap-2 w-full">
                <button onClick={() => setShowMobileSearch(false)} className="p-2">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="মিতালি খুঁজুন" 
                    value={headerSearchInput}
                    onChange={(e) => setHeaderSearchInput(e.target.value)}
                    className="bg-[#F0F2F5] pl-4 pr-10 py-2 rounded-full text-sm outline-none w-full focus:ring-1 focus:ring-gray-300"
                  />
                  {headerSearchInput && (
                    <button 
                      onClick={() => setHeaderSearchInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
                {headerSearchResults.length > 0 && (
                  <div className="fixed top-14 left-0 right-0 bg-white shadow-2xl border-b border-gray-200 max-h-[70vh] overflow-y-auto z-[100]">
                    {headerSearchResults.map((resId) => (
                      <div key={resId} className="flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                            {allProfiles[resId]?.profileImageUrl ? (
                              <img src={allProfiles[resId].profileImageUrl} alt={resId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <User className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800">{resId}</span>
                            {allProfiles[resId]?.location && (
                              <span className="text-xs text-gray-500">{allProfiles[resId].location}</span>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            handleSendFriendRequestTo(resId);
                            setShowMobileSearch(false);
                          }}
                          disabled={sentRequests.some(r => r.toUserId === resId)}
                          className={`px-4 py-2 rounded-lg text-sm font-bold ${sentRequests.some(r => r.toUserId === resId) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-[#1D4ED8] text-white'}`}
                        >
                          {sentRequests.some(r => r.toUserId === resId) ? 'রিকোয়েস্ট সেন্ড' : 'রিকোয়েস্ট'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={() => setShowMobileSearch(true)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <Search className="w-5 h-5 text-gray-700" />
              </button>
            )}
          </div>
        </div>

        {!showMobileSearch && (
          <nav className="hidden lg:flex items-center gap-2 h-full">
            <button className="h-full px-10 border-b-4 border-[#1D4ED8] text-[#1D4ED8]">
              <Home className="w-7 h-7" />
            </button>
            <button className="h-full px-10 text-gray-500 hover:bg-gray-100 rounded-lg">
              <Users className="w-7 h-7" />
            </button>
            <button className="h-full px-10 text-gray-500 hover:bg-gray-100 rounded-lg">
              <Video className="w-7 h-7" />
            </button>
            <button className="h-full px-10 text-gray-500 hover:bg-gray-100 rounded-lg">
              <ShoppingBag className="w-7 h-7" />
            </button>
          </nav>
        )}

        {!showMobileSearch && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowMobileFriends(!showMobileFriends)}
              className={`p-2 rounded-full transition-colors relative lg:hidden ${showMobileFriends ? 'bg-blue-50 text-[#1D4ED8]' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            >
              <Users className="w-5 h-5" />
            </button>
            <button className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors relative">
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
          <button className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors relative">
            <MessageSquare className="w-5 h-5 text-gray-700" />
            {(Object.values(unreadCounts).reduce((a: number, b: unknown) => a + (b as number), 0) as number) > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {Object.values(unreadCounts).reduce((a: number, b: unknown) => a + (b as number), 0) as number}
              </span>
            )}
          </button>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-full transition-colors relative ${showNotifications ? 'bg-blue-50 text-[#1D4ED8]' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          >
            <Bell className="w-5 h-5" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
          <button 
            onClick={onBack}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-gray-700"
            title="লগ আউট"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <div 
            onClick={() => setIsEditingProfile(true)}
            className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 ml-2 cursor-pointer"
          >
            {userProfile?.profileImageUrl ? (
              <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500" />
              </div>
            )}
          </div>
        </div>
      )}
    </header>

      <main className="flex-1 flex justify-center gap-8 p-4 max-w-[1400px] mx-auto w-full">
        {/* Left Sidebar */}
        <aside className="hidden xl:block w-72 space-y-2">
          <div className="flex items-center gap-3 p-2 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
            <div className="w-9 h-9 rounded-full overflow-hidden">
              {userProfile?.profileImageUrl ? (
                <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
              )}
            </div>
            <span className="font-semibold text-gray-800">{userId}</span>
          </div>
          <div className="flex items-center gap-3 p-2 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
            <Users className="w-9 h-9 text-[#1D4ED8]" />
            <span className="font-semibold text-gray-800">বন্ধুরা</span>
          </div>
          <div className="flex items-center gap-3 p-2 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
            <Video className="w-9 h-9 text-[#1D4ED8]" />
            <span className="font-semibold text-gray-800">ভিডিও</span>
          </div>
          <div className="flex items-center gap-3 p-2 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
            <ShoppingBag className="w-9 h-9 text-[#1D4ED8]" />
            <span className="font-semibold text-gray-800">মার্কেটপ্লেস</span>
          </div>
        </aside>

        {/* Center Feed */}
        <div className="max-w-[680px] w-full space-y-4">
          {/* Create Post */}
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex gap-3 mb-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                {userProfile?.profileImageUrl ? (
                  <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-500" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsCreatingPost(true)}
                className="bg-[#F0F2F5] hover:bg-gray-200 text-gray-600 text-left px-4 py-2 rounded-full flex-1 transition-colors"
              >
                {userId}, আপনি এখন কী ভাবছেন?
              </button>
            </div>
            <hr className="border-gray-100 mb-3" />
            <div className="flex justify-between">
              <button className="flex items-center gap-2 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors text-gray-600 font-semibold">
                <Video className="w-6 h-6 text-red-500" />
                লাইভ ভিডিও
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors text-gray-600 font-semibold"
              >
                <ImageIcon className="w-6 h-6 text-[#42B72A]" />
                ছবি/ভিডিও
              </button>
              <button className="flex items-center gap-2 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors text-gray-600 font-semibold">
                <Heart className="w-6 h-6 text-yellow-500" />
                অনুভূতি/অ্যাক্টিভিটি
              </button>
            </div>
          </div>

          {/* Posts Feed */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
                <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-400">এখনও কোনো পোস্ট নেই</h3>
                <p className="text-gray-400">বন্ধু যোগ করুন এবং তাদের পোস্ট দেখুন!</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Post Header */}
                  <div className="p-4 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100">
                        {allProfiles[post.userId]?.profileImageUrl ? (
                          <img src={allProfiles[post.userId].profileImageUrl} alt={post.userId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 hover:underline cursor-pointer">{post.userId}</h4>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          {formatDistanceToNow(post.createdAt)} ago • <Users className="w-3 h-3" />
                        </p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <MoreHorizontal className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Post Content */}
                  <div className="px-4 pb-3">
                    <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                  </div>

                  {/* Post Image */}
                  {post.imageUrl && (
                    <div className="border-y border-gray-100 bg-gray-50">
                      <img src={post.imageUrl} alt="Post" className="w-full max-h-[600px] object-contain mx-auto" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  {/* Post Stats */}
                  <div className="px-4 py-2 flex justify-between items-center text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      {post.reactions && Object.keys(post.reactions).length > 0 && (
                        <div className="flex -space-x-1 items-center">
                          {Array.from(new Set(Object.values(post.reactions))).slice(0, 3).map((type, idx) => (
                            <span key={idx} className="text-xs">{getReactionEmoji(type as string)}</span>
                          ))}
                          <span className="ml-1 text-gray-500">{Object.keys(post.reactions).length}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <span>{post.replies?.length || 0} টি কমেন্ট</span>
                      <span>৫ টি শেয়ার</span>
                    </div>
                  </div>

                  <hr className="mx-4 border-gray-100" />

                  {/* Post Actions */}
                  <div className="px-4 py-1 flex justify-between relative">
                    <div 
                      className="flex-1 relative"
                      onMouseEnter={() => setHoveredPostId(post.id)}
                      onMouseLeave={() => setHoveredPostId(null)}
                    >
                      {hoveredPostId === post.id && (
                        <div className="absolute bottom-full left-0 pb-2 z-10">
                          <div className="bg-white shadow-xl border border-gray-200 rounded-full p-1 flex gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            {reactionOptions.map((opt) => (
                              <button
                                key={opt.type}
                                onClick={() => {
                                  handleToggleReaction(post.id, opt.type);
                                  setHoveredPostId(null);
                                }}
                                className="hover:scale-125 transition-transform p-1.5 text-xl"
                                title={opt.label}
                              >
                                {opt.emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <button 
                        onClick={() => handleToggleReaction(post.id, 'like')}
                        className={`w-full flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-lg transition-colors font-semibold ${
                          post.reactions?.[userId] 
                            ? getReactionColor(post.reactions[userId] as string) 
                            : 'text-gray-600'
                        }`}
                      >
                        {post.reactions?.[userId] ? (
                          <span className="text-xl">{getReactionEmoji(post.reactions[userId] as string)}</span>
                        ) : (
                          <ThumbsUp className="w-5 h-5" />
                        )}
                        {post.reactions?.[userId] ? getReactionLabel(post.reactions[userId] as string) : 'লাইক'}
                      </button>
                    </div>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 font-semibold">
                      <MessageSquare className="w-5 h-5" />
                      কমেন্ট
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 font-semibold">
                      <Share2 className="w-5 h-5" />
                      শেয়ার
                    </button>
                  </div>

                  {/* Comments Section */}
                  {post.replies && post.replies.length > 0 && (
                    <div className="px-4 pb-4 space-y-3 mt-2">
                      {post.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="bg-[#F0F2F5] p-2 px-3 rounded-2xl max-w-[90%]">
                            <p className="text-xs font-bold text-gray-900">{reply.isAdmin ? 'অ্যাডমিন' : 'ইউজার'}</p>
                            <p className="text-sm text-gray-800">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Comment */}
                  <div className="px-4 pb-4 flex gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      {userProfile?.profileImageUrl ? (
                        <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 bg-[#F0F2F5] rounded-2xl flex items-center px-3">
                      <input 
                        type="text" 
                        placeholder="কমেন্ট লিখুন..."
                        value={replyText[post.id] || ''}
                        onChange={(e) => setReplyText({ ...replyText, [post.id]: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && handleReply(post.id)}
                        className="bg-transparent border-none outline-none flex-1 py-1.5 text-sm"
                      />
                      <button 
                        onClick={() => handleReply(post.id)}
                        className="text-[#1D4ED8] hover:bg-blue-50 p-1 rounded-full transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar - Friends & Contacts */}
        <aside className="hidden lg:block w-72 space-y-4">
          {incomingRequests.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider">বর্তমান ফ্রেন্ড রিকোয়েস্ট</h3>
              </div>
              <div className="space-y-3 px-2">
                {incomingRequests.map((req) => (
                  <div key={req.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
                        {allProfiles[req.fromUserId]?.profileImageUrl ? (
                          <img src={allProfiles[req.fromUserId].profileImageUrl} alt={req.fromUserId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-sm text-gray-800 truncate">{req.fromUserId}</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => respondToFriendRequest(req.id, 'accepted', req.fromUserId, req.toUserId)}
                        className="flex-1 bg-[#1D4ED8] text-white py-1.5 rounded-md text-xs font-bold hover:bg-[#1a44c2] transition-colors"
                      >
                        গ্রহণ
                      </button>
                      <button 
                        onClick={() => respondToFriendRequest(req.id, 'rejected', req.fromUserId, req.toUserId)}
                        className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded-md text-xs font-bold hover:bg-gray-300 transition-colors"
                      >
                        বাতিল
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <hr className="border-gray-200 mx-2" />
            </div>
          )}

          <div className="flex justify-between items-center px-2">
            <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider">আপনার বন্ধুরা</h3>
            <div className="flex gap-2">
              <Search className="w-4 h-4 text-gray-500 cursor-pointer" />
              <MoreHorizontal className="w-4 h-4 text-gray-500 cursor-pointer" />
            </div>
          </div>
          
          <div className="space-y-1">
            {friends.length === 0 ? (
              <p className="text-sm text-gray-400 px-2 italic">কোনো বন্ধু নেই</p>
            ) : (
              friends.map((friendId) => (
                <div 
                  key={friendId} 
                  onClick={() => setActiveChatFriend(friendId)}
                  className="flex items-center gap-3 p-2 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors relative"
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 relative">
                    {allProfiles[friendId]?.profileImageUrl ? (
                      <img src={allProfiles[friendId].profileImageUrl} alt={friendId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <span className="font-semibold text-gray-800 flex-1">{friendId}</span>
                  <div className="flex items-center gap-1">
                    {unreadCounts[friendId] > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-1">
                        {unreadCounts[friendId]}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnfriend(friendId);
                      }}
                      className="p-1.5 hover:bg-gray-300 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                      title="আনফ্রেন্ড করুন"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <hr className="border-gray-200 mx-2" />

          <div className="px-2">
            <button 
              onClick={() => setIsAddingFriend(true)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-bold"
            >
              <UserPlus className="w-5 h-5" />
              বন্ধু খুঁজুন
            </button>
          </div>
        </aside>
      </main>

      {/* Modals & Overlays */}
      {showNotifications && (
        <div className="fixed top-14 right-4 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-[60] max-h-[80vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-xl">নোটিফিকেশন</h3>
            <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-2">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-500 py-8">কোনো নোটিফিকেশন নেই</p>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-3 rounded-lg flex gap-3 hover:bg-gray-100 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50' : ''}`}
                  onClick={() => markNotificationAsRead(n.id)}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${!n.read ? 'font-bold' : ''}`}>{n.message}</p>
                    <p className="text-xs text-[#1D4ED8] mt-1">{formatDistanceToNow(n.createdAt)} ago</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                    className="p-1 hover:bg-gray-200 rounded-full h-fit"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-md shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="font-bold text-2xl">প্রোফাইল এডিট করুন</h3>
              <button onClick={() => setIsEditingProfile(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Profile Image Section */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 shadow-lg">
                    {userProfile?.profileImageUrl ? (
                      <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <User className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => profileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-[#1D4ED8] text-white rounded-full shadow-lg hover:bg-[#1a44c2] transition-all"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <input 
                    type="file" 
                    ref={profileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleProfileImageChange} 
                  />
                </div>
                <h4 className="mt-4 font-bold text-xl">{userId}</h4>
                <p className="text-gray-500 text-sm">আপনার প্রোফাইল তথ্য পরিবর্তন করুন</p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">বায়ো (Bio)</label>
                  <textarea 
                    value={profileFormData.bio}
                    onChange={(e) => setProfileFormData({ ...profileFormData, bio: e.target.value })}
                    placeholder="আপনার সম্পর্কে কিছু লিখুন..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 min-h-[120px] outline-none focus:ring-2 focus:ring-[#1D4ED8] transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">অবস্থান (Location)</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      value={profileFormData.location}
                      onChange={(e) => setProfileFormData({ ...profileFormData, location: e.target.value })}
                      placeholder="আপনার শহর বা দেশ"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#1D4ED8] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">জন্ম তারিখ</label>
                    <input 
                      type="date" 
                      value={profileFormData.birthDate}
                      onChange={(e) => setProfileFormData({ ...profileFormData, birthDate: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1D4ED8] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">লিঙ্গ (Gender)</label>
                    <select 
                      value={profileFormData.gender}
                      onChange={(e) => setProfileFormData({ ...profileFormData, gender: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1D4ED8] transition-all"
                    >
                      <option value="">নির্বাচন করুন</option>
                      <option value="male">পুরুষ</option>
                      <option value="female">মহিলা</option>
                      <option value="other">অন্যান্য</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
                  >
                    বাতিল
                  </button>
                  <button 
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="flex-1 py-3 bg-[#1D4ED8] text-white font-bold rounded-xl hover:bg-[#1a44c2] transition-all disabled:opacity-50"
                  >
                    {isUpdatingProfile ? 'আপডেট হচ্ছে...' : 'সেভ করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {isAddingFriend && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-xl">বন্ধু খুঁজুন</h3>
              <button onClick={() => setIsAddingFriend(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="ইউজার আইডি লিখুন"
                  value={friendIdInput}
                  onChange={(e) => setFriendIdInput(e.target.value)}
                  className="w-full bg-gray-100 pl-10 pr-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg">
                  {searchResults.map((resId) => (
                    <div key={resId} className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
                          {allProfiles[resId]?.profileImageUrl ? (
                            <img src={allProfiles[resId].profileImageUrl} alt={resId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-gray-800">{resId}</span>
                      </div>
                      <button 
                        onClick={() => handleSendFriendRequestTo(resId)}
                        disabled={sentRequests.some(r => r.toUserId === resId)}
                        className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${sentRequests.some(r => r.toUserId === resId) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-[#1D4ED8] text-white hover:bg-[#1a44c2]'}`}
                      >
                        {sentRequests.some(r => r.toUserId === resId) ? 'রিকোয়েস্ট সেন্ড' : 'রিকোয়েস্ট'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {friendIdInput && searchResults.length === 0 && (
                <p className="text-center text-gray-500 py-2">কোনো ইউজার পাওয়া যায়নি</p>
              )}

              <button 
                onClick={handleSendFriendRequest}
                className="w-full bg-[#1D4ED8] hover:bg-[#1a44c2] text-white font-bold py-3 rounded-lg transition-all"
              >
                সরাসরি রিকোয়েস্ট পাঠান
              </button>

              {incomingRequests.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="font-bold mb-3">আগত রিকোয়েস্ট</h4>
                  <div className="space-y-3">
                    {incomingRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-500" />
                          </div>
                          <span className="font-bold">{req.fromUserId}</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => respondToFriendRequest(req.id, 'accepted', req.fromUserId, req.toUserId)}
                            className="bg-[#1D4ED8] text-white px-4 py-1.5 rounded-md text-sm font-bold"
                          >
                            গ্রহণ
                          </button>
                          <button 
                            onClick={() => respondToFriendRequest(req.id, 'rejected', req.fromUserId, req.toUserId)}
                            className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded-md text-sm font-bold"
                          >
                            বাতিল
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showMobileFriends && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-xs shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-xl">আপনার বন্ধুরা</h3>
              <button onClick={() => setShowMobileFriends(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {friends.length === 0 ? (
                <p className="text-center text-gray-500 py-8 italic">কোনো বন্ধু নেই</p>
              ) : (
                friends.map((friendId) => (
                  <div 
                    key={friendId} 
                    onClick={() => {
                      setActiveChatFriend(friendId);
                      setShowMobileFriends(false);
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors relative"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 relative">
                      {allProfiles[friendId]?.profileImageUrl ? (
                        <img src={allProfiles[friendId].profileImageUrl} alt={friendId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                      <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{friendId}</p>
                      {allProfiles[friendId]?.location && (
                        <p className="text-[10px] text-gray-500">{allProfiles[friendId].location}</p>
                      )}
                    </div>
                    {unreadCounts[friendId] > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        {unreadCounts[friendId]}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button 
                onClick={() => {
                  setIsAddingFriend(true);
                  setShowMobileFriends(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#1D4ED8] text-white rounded-xl font-bold shadow-lg shadow-blue-200"
              >
                <UserPlus className="w-5 h-5" />
                নতুন বন্ধু খুঁজুন
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreatingPost && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-[500px] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-xl text-center flex-1">পোস্ট তৈরি করুন</h3>
              <button onClick={() => setIsCreatingPost(false)} className="p-2 hover:bg-gray-100 rounded-full bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  {userProfile?.profileImageUrl ? (
                    <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{userId}</p>
                  <div className="bg-gray-200 px-2 py-0.5 rounded flex items-center gap-1 text-xs font-bold w-fit">
                    <Users className="w-3 h-3" /> বন্ধুরা
                  </div>
                </div>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`${userId}, আপনি এখন কী ভাবছেন?`}
                className="w-full min-h-[150px] text-xl outline-none resize-none placeholder-gray-500"
              />

              {selectedImage && (
                <div className="relative mt-2 rounded-lg overflow-hidden border border-gray-200">
                  <img src={selectedImage} alt="Selected" className="w-full max-h-[300px] object-cover" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div className="mt-4 p-3 border border-gray-300 rounded-lg flex items-center justify-between">
                <span className="font-semibold text-gray-700">আপনার পোস্টে যোগ করুন</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ImageIcon className="w-6 h-6 text-[#42B72A]" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <UserPlus className="w-6 h-6 text-[#1D4ED8]" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Heart className="w-6 h-6 text-yellow-500" />
                  </button>
                </div>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !message.trim()}
                className={`w-full mt-4 py-2 rounded-lg font-bold text-white transition-all ${
                  isSubmitting || !message.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#1D4ED8] hover:bg-[#1a44c2]'
                }`}
              >
                {isSubmitting ? 'পোস্ট হচ্ছে...' : 'পোস্ট করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isUpdatingProfile && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-xl">প্রোফাইল আপডেট</h3>
              <button onClick={() => setIsUpdatingProfile(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-center space-y-6">
              <div className="relative inline-block group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#1D4ED8] bg-gray-100">
                  {userProfile?.profileImageUrl ? (
                    <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => profileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 bg-[#1D4ED8] text-white p-2 rounded-full shadow-lg hover:bg-[#1a44c2] transition-all"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input type="file" accept="image/*" className="hidden" ref={profileInputRef} onChange={handleProfileImageChange} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{userId}</h2>
                <p className="text-gray-500">আপনার প্রোফাইল ছবি পরিবর্তন করুন</p>
              </div>
              <button 
                onClick={() => setIsUpdatingProfile(false)}
                className="w-full bg-[#1D4ED8] text-white font-bold py-3 rounded-lg"
              >
                সম্পন্ন
              </button>
            </div>
          </div>
        </div>
      )}

      {activeChatFriend && (
        <ChatWindow 
          userId={userId} 
          friendId={activeChatFriend} 
          onClose={() => setActiveChatFriend(null)} 
        />
      )}
    </div>
  );
};

export default BlogSystem;
