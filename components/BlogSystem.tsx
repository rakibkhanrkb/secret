
import React, { useState, useEffect, useRef } from 'react';
import { createPost, subscribeToPosts, isFirebaseConfigured, sendFriendRequest, subscribeToIncomingFriendRequests, subscribeToSentFriendRequests, respondToFriendRequest, subscribeToFriends, subscribeToAllVisiblePosts, addReply, checkUserIdExists, unfriend, subscribeToNotifications, markNotificationAsRead, deleteNotification, subscribeToUnreadMessageCounts, subscribeToUserProfile, updateUserProfile, subscribeToAllUserProfiles, toggleReaction, removeReaction, subscribeToAllUserIds, subscribeToAllUserAccounts, updateUserAccount, deleteUserAccount, subscribeToRegistrationRequests, subscribeToAllFriendships, subscribeToActiveCalls, subscribeToCallStatus, initiateCall, requestNotificationPermission, onForegroundMessage, sendChatMessage, updateUserPresence, uploadFile } from '../services/firebase';
import { Post, FriendRequest, Notification, UserProfile, UserAccount, RegistrationRequest, Call } from '../types';
import { Send, MessageCircle, Heart, AlertCircle, ArrowLeft, UserPlus, Users, Check, X, Search, Bell, UserMinus, MessageSquare, Image as ImageIcon, Trash2, Camera, User, Home, Video, ShoppingBag, Menu, LogOut, MoreHorizontal, ThumbsUp, Share2, Edit, MapPin, Calendar, Info, Shield, Key, Phone, Lock, PhoneOff, Mic, MicOff, VideoOff, Moon, Sun, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ChatWindow from './ChatWindow';
import CallWindow from './CallWindow';
import { compressImage, base64ToBlob } from '@/src/utils/imageUtils';

interface BlogSystemProps {
  userId: string;
  onBack: () => void;
  onGoToChat: () => void;
}

const BlogSystem: React.FC<BlogSystemProps> = ({ userId, onBack, onGoToChat }) => {
  const [message, setMessage] = useState('');
  const [headerSearchInput, setHeaderSearchInput] = useState('');
  const [headerSearchResults, setHeaderSearchResults] = useState<string[]>([]);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [postToShare, setPostToShare] = useState<Post | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSearchTerm, setShareSearchTerm] = useState('');
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [optimisticPosts, setOptimisticPosts] = useState<Post[]>([]);
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
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<{ [userId: string]: UserProfile }>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    displayName: '',
    bio: '',
    location: '',
    birthDate: '',
    gender: '',
    statusMessage: ''
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [allFriendships, setAllFriendships] = useState<{ u1: string, u2: string }[]>([]);
  const [suggestedFriends, setSuggestedFriends] = useState<{ userId: string, mutualCount: number, commonInterests: string[] }[]>([]);
  const [showProfileView, setShowProfileView] = useState(false);
  const [showFriendCount, setShowFriendCount] = useState(false);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequest[]>([]);
  const [adminTab, setAdminTab] = useState<'accounts' | 'requests'>('accounts');
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Presence logic
  useEffect(() => {
    if (!userId) return;

    // Set online immediately
    updateUserPresence(userId, true);

    // Heartbeat every 60 seconds
    const interval = setInterval(() => {
      updateUserPresence(userId, true);
    }, 60000);

    // Set offline on unmount
    return () => {
      clearInterval(interval);
      updateUserPresence(userId, false);
    };
  }, [userId]);

  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const getDisplayName = (uid: string) => {
    return allProfiles[uid]?.displayName || uid;
  };

  const totalUnreadCount: number = (Object.values(unreadCounts) as number[]).reduce((acc: number, count: number) => acc + count, 0);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubFriends = subscribeToFriends(userId, (friendList) => {
      setFriends(friendList);
      localStorage.setItem('mitali_friends', JSON.stringify(friendList));
    });
    const unsubRequests = subscribeToIncomingFriendRequests(userId, setIncomingRequests);
    const unsubSentRequests = subscribeToSentFriendRequests(userId, setSentRequests);
    const unsubNotifications = subscribeToNotifications(userId, setNotifications);
    const unsubUnread = subscribeToUnreadMessageCounts(userId, setUnreadCounts);
    const unsubProfile = subscribeToUserProfile(userId, (profile) => {
      setUserProfile(profile);
      if (profile?.displayName) {
        localStorage.setItem('mitali_displayName', profile.displayName);
      }
    });
    const unsubAllProfiles = subscribeToAllUserProfiles(setAllProfiles);
    const unsubAllUserIds = subscribeToAllUserIds(setAllUserIds);
    const unsubAllFriendships = subscribeToAllFriendships(setAllFriendships);
    const unsubActiveCalls = subscribeToActiveCalls(userId, (call) => {
      setActiveCall(call);
    });

    // Request notification permission
    requestNotificationPermission(userId);

    // Handle foreground messages
    const unsubForeground = onForegroundMessage((payload) => {
      console.log("Foreground message received:", payload);
      // Note: To actually send push notifications to other users, 
      // a backend service or Firebase Cloud Function is required 
      // to call the FCM API using the recipient's fcmToken.
    });

    let unsubAccounts: (() => void) | null = null;
    let unsubRegRequests: (() => void) | null = null;
    if (userId === 'rkb@93') {
      unsubAccounts = subscribeToAllUserAccounts(setUserAccounts);
      unsubRegRequests = subscribeToRegistrationRequests(setRegistrationRequests);
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
      unsubAllFriendships();
      unsubActiveCalls();
      unsubForeground();
      if (unsubAccounts) unsubAccounts();
      if (unsubRegRequests) unsubRegRequests();
    };
  }, [userId]);

  useEffect(() => {
    if (userProfile) {
      setProfileFormData({
        displayName: userProfile.displayName || userId,
        bio: userProfile.bio || '',
        location: userProfile.location || '',
        birthDate: userProfile.birthDate || '',
        gender: userProfile.gender || ''
      });
    }
  }, [userProfile, userId]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubscribe = subscribeToAllVisiblePosts(userId, friends, (updatedPosts) => {
      setPosts(updatedPosts);
    });
    return () => unsubscribe();
  }, [userId, friends]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedImage && !selectedVideo) return;

    if (!isFirebaseConfigured) {
      alert('Firebase কনফিগারেশন করা নেই। দয়া করে API Key সেট করুন।');
      return;
    }

    // Capture values
    const messageToPost = message.trim();
    const imageToPost = selectedImage;
    const videoToPost = selectedVideo;
    const fileToPost = selectedFile;

    // Clear inputs immediately for instant feel
    setMessage('');
    setSelectedImage(null);
    setSelectedVideo(null);
    setSelectedFile(null);
    setIsCreatingPost(false);
    setUploadProgress(0);

    // Create optimistic post
    const tempId = 'temp-' + Date.now();
    const optimisticPost: Post = {
      id: tempId,
      userId: userId,
      content: messageToPost,
      imageUrl: imageToPost || undefined,
      videoUrl: videoToPost || undefined,
      createdAt: Date.now(),
      reactions: {},
      replies: [],
      isOptimistic: true
    };

    setOptimisticPosts(prev => [optimisticPost, ...prev]);

    try {
      let finalImageUrl = undefined;
      let finalVideoUrl = undefined;

      if (fileToPost) {
        try {
          const url = await uploadFile(fileToPost, fileToPost.name || 'file', (progress) => {
            setUploadProgress(progress);
          });
          if (fileToPost.type.startsWith('image/')) {
            finalImageUrl = url;
          } else if (fileToPost.type.startsWith('video/')) {
            finalVideoUrl = url;
          }
        } catch (storageError) {
          console.error("Blog storage upload failed:", storageError);
          // Fallback to base64 ONLY if small enough
          if (fileToPost.type.startsWith('image/') && imageToPost && imageToPost.length * 0.75 < 800 * 1024) {
            finalImageUrl = imageToPost;
          } else {
            throw new Error("ফাইল আপলোড ব্যর্থ হয়েছে।");
          }
        }
      } else {
        // Simulate progress for text-only posts
        const interval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev === null || prev >= 90) return prev;
            return prev + 10;
          });
        }, 100);
        setTimeout(() => clearInterval(interval), 1000);
      }

      await createPost(userId, messageToPost, finalImageUrl, finalVideoUrl);
      
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 500);
      
      // Remove optimistic post after successful creation
      setOptimisticPosts(prev => prev.filter(p => p.id !== tempId));
    } catch (error) {
      console.error("Post creation error:", error);
      setOptimisticPosts(prev => prev.filter(p => p.id !== tempId));
      setMessage(messageToPost);
      setSelectedImage(imageToPost);
      setSelectedVideo(videoToPost);
      setSelectedFile(fileToPost);
      alert('পোস্ট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert('ফাইল সাইজ ২০ মেগাবাইটের বেশি হতে পারবে না।');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        if (file.type.startsWith('image/')) {
          try {
            // Re-enable fast compression for speed and reliability
            const compressed = await compressImage(result, 1000, 1000, 0.6);
            setSelectedImage(compressed);
            setSelectedVideo(null);
            // Update selectedFile with compressed blob for faster upload
            const blob = base64ToBlob(compressed);
            setSelectedFile(new File([blob], file.name, { type: 'image/jpeg' }));
          } catch (error) {
            setSelectedImage(result);
            setSelectedVideo(null);
          }
        } else if (file.type.startsWith('video/')) {
          setSelectedVideo(result);
          setSelectedImage(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (userProfile) {
      setProfileFormData({
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        location: userProfile.location || '',
        birthDate: userProfile.birthDate || '',
        gender: userProfile.gender || '',
        statusMessage: userProfile.statusMessage || ''
      });
    }
  }, [userProfile]);

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUpdatingProfile(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string, 400, 400, 0.6);
          await updateUserProfile(userId, { profileImageUrl: compressed });
        } catch (error) {
          console.error("Profile image compression error:", error);
          try {
            await updateUserProfile(userId, { profileImageUrl: reader.result as string });
          } catch (err) {
            alert('প্রোফাইল ছবি আপডেট করতে সমস্যা হয়েছে।');
          }
        } finally {
          setIsUpdatingProfile(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileImageChangeFromUrl = async (url: string) => {
    setIsUpdatingProfile(true);
    try {
      await updateUserProfile(userId, { profileImageUrl: url });
    } catch (error) {
      alert('অবতার আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setIsUpdatingProfile(false);
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

  useEffect(() => {
    if (!userId || allUserIds.length === 0) return;

    // 1. Build adjacency list for all friendships
    const adj: { [uid: string]: Set<string> } = {};
    allFriendships.forEach(({ u1, u2 }) => {
      if (!adj[u1]) adj[u1] = new Set();
      if (!adj[u2]) adj[u2] = new Set();
      adj[u1].add(u2);
      adj[u2].add(u1);
    });

    const myFriends = adj[userId] || new Set();
    const pendingSent = new Set(sentRequests.map(r => r.toUserId));
    const pendingIncoming = new Set(incomingRequests.map(r => r.fromUserId));

    const suggestions: { userId: string, mutualCount: number, commonInterests: string[] }[] = [];

    allUserIds.forEach(otherId => {
      if (otherId === userId) return;
      if (myFriends.has(otherId)) return;
      if (pendingSent.has(otherId)) return;
      if (pendingIncoming.has(otherId)) return;

      // Calculate mutual friends
      let mutualCount = 0;
      const otherFriends = adj[otherId] || new Set();
      otherFriends.forEach(f => {
        if (myFriends.has(f)) mutualCount++;
      });

      // Calculate common interests (simple keyword matching in bio)
      const commonInterests: string[] = [];
      const myBio = (userProfile?.bio || '').toLowerCase();
      const otherBio = (allProfiles[otherId]?.bio || '').toLowerCase();
      
      const keywords = ['travel', 'music', 'coding', 'sports', 'reading', 'movies', 'food', 'gaming', 'art', 'photography', 'fitness'];
      keywords.forEach(kw => {
        if (myBio.includes(kw) && otherBio.includes(kw)) {
          commonInterests.push(kw);
        }
      });

      if (mutualCount > 0 || commonInterests.length > 0) {
        suggestions.push({ userId: otherId, mutualCount, commonInterests });
      }
    });

    // Sort by mutual friends count then by interests
    suggestions.sort((a, b) => (b.mutualCount + b.commonInterests.length) - (a.mutualCount + a.commonInterests.length));
    setSuggestedFriends(suggestions.slice(0, 10)); // Top 10 suggestions
  }, [userId, allFriendships, allUserIds, friends, sentRequests, incomingRequests, userProfile, allProfiles]);

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
      await addReply(postId, userId, content, false);
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

  const handleSharePost = async (friendId: string) => {
    if (!postToShare) return;
    
    setIsSharing(true);
    try {
      await sendChatMessage(userId, friendId, '', undefined, postToShare.id);
      alert('পোস্ট শেয়ার করা হয়েছে!');
      setPostToShare(null);
    } catch (error) {
      console.error("Error sharing post:", error);
      alert('পোস্ট শেয়ার করতে সমস্যা হয়েছে।');
    } finally {
      setIsSharing(false);
    }
  };

  const filteredFriendsForShare = friends.filter(fid => 
    (getDisplayName(fid) || '').toLowerCase().includes(shareSearchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-gray-900 flex flex-col transition-colors duration-200">
      {/* Facebook Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 h-14 flex items-center justify-between px-4 transition-colors duration-200">
        <div className="flex items-center gap-2">
          {!showMobileSearch && <div className="text-[#1D4ED8] font-bold text-4xl tracking-tighter">Mitali</div>}
          
          {/* Desktop Search */}
          <div className="relative ml-2 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
            <input 
              type="text" 
              placeholder="মিতালি খুঁজুন" 
              value={headerSearchInput}
              onChange={(e) => setHeaderSearchInput(e.target.value)}
              className="bg-[#F0F2F5] dark:bg-gray-700 dark:text-white pl-10 pr-4 py-2 rounded-full text-sm outline-none w-60 focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 transition-colors duration-200"
            />
            {headerSearchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 shadow-2xl rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[100]">
                <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 px-2">সার্চ রেজাল্ট</span>
                  <button onClick={() => setHeaderSearchInput('')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full">
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {headerSearchResults.map((resId) => (
                    <div key={resId} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0">
                      <div 
                        onClick={() => {
                          setViewingProfileId(resId);
                          setHeaderSearchInput('');
                        }}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 flex-shrink-0 group-hover:border-blue-400 transition-colors">
                          {allProfiles[resId]?.profileImageUrl ? (
                            <img src={allProfiles[resId].profileImageUrl} alt={resId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 dark:text-gray-200 text-sm group-hover:text-[#1D4ED8] dark:group-hover:text-[#3B82F6] transition-colors">{resId}</span>
                          {allProfiles[resId]?.location && (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{allProfiles[resId].location}</span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleSendFriendRequestTo(resId)}
                        disabled={sentRequests.some(r => r.toUserId === resId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sentRequests.some(r => r.toUserId === resId) ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-not-allowed' : 'bg-[#1D4ED8] text-white hover:bg-[#1a44c2]'}`}
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
                      <div 
                        onClick={() => {
                          setViewingProfileId(resId);
                          setShowMobileSearch(false);
                        }}
                        className="flex items-center gap-3 cursor-pointer"
                      >
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
                          <span className="font-bold text-gray-800">{getDisplayName(resId)}</span>
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
            <button className="h-full px-10 border-b-4 border-[#1D4ED8] dark:border-blue-500 text-[#1D4ED8] dark:text-blue-500 transition-colors">
              <Home className="w-7 h-7" />
            </button>
            <button 
              onClick={() => setShowFriendsList(true)}
              className="h-full px-10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative transition-colors"
            >
              <Users className="w-7 h-7" />
              {incomingRequests.length > 0 && (
                <span className="absolute top-2 right-6 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-gray-800">
                  {incomingRequests.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setShowFriendsList(true)}
              className="h-full px-10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative transition-colors"
            >
              <MessageSquare className="w-7 h-7" />
              {totalUnreadCount > 0 && (
                <span className="absolute top-2 right-6 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-gray-800 animate-badge-pulse shadow-lg">
                  {totalUnreadCount}
                </span>
              )}
            </button>
            <button 
              onClick={onGoToChat}
              className="h-full px-10 text-rose-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="বন্ধুদের সাথে গ্রুপ তৈরি করুন"
            >
              <MessageSquare className="w-7 h-7" />
            </button>
            <button className="h-full px-10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Video className="w-7 h-7" />
            </button>
          </nav>
        )}

        {!showMobileSearch && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFriendsList(!showFriendsList)}
              className={`p-2 rounded-full transition-colors relative lg:hidden ${showFriendsList ? 'bg-blue-50 dark:bg-blue-900/30 text-[#1D4ED8] dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'}`}
            >
              <Users className="w-5 h-5" />
              {incomingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white dark:border-gray-800">
                  {incomingRequests.length}
                </span>
              )}
            </button>
            <button 
              onClick={onGoToChat}
              className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors relative text-rose-500"
              title="বন্ধুদের সাথে গ্রুপ তৈরি করুন"
            >
              <Users className="w-5 h-5" />
            </button>
          <button 
            onClick={() => setShowFriendsList(!showFriendsList)}
            className={`p-2 rounded-full transition-colors relative ${showFriendsList ? 'bg-blue-50 dark:bg-blue-900/30 text-[#1D4ED8] dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'}`}
          >
            <MessageSquare className="w-5 h-5" />
            {totalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-badge-pulse shadow-lg border border-white dark:border-gray-800">
                {totalUnreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full transition-colors relative bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-full transition-colors relative ${showNotifications ? 'bg-blue-50 dark:bg-blue-900/30 text-[#1D4ED8] dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'}`}
          >
            <Bell className="w-5 h-5" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white dark:border-gray-800">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
          <div 
            onClick={() => setShowProfileView(true)}
            className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 ml-2 cursor-pointer"
          >
            {userProfile?.profileImageUrl ? (
              <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </div>
            )}
          </div>
        </div>
      )}
    </header>

      <main className="flex-1 flex justify-center gap-8 p-4 max-w-[1400px] mx-auto w-full">
        {/* Left Sidebar */}
        <aside className="hidden xl:block w-72 space-y-2">
          <div className="flex items-center gap-3 p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors">
            <div className="w-9 h-9 rounded-full overflow-hidden">
              {userProfile?.profileImageUrl ? (
                <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-800 dark:text-gray-200">{getDisplayName(userId)}</span>
              {userProfile?.statusMessage && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{userProfile.statusMessage}</span>
              )}
            </div>
          </div>
          <div 
            onClick={() => setShowFriendsList(true)}
            className="flex items-center gap-3 p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
          >
            <Users className="w-9 h-9 text-[#1D4ED8] dark:text-blue-500" />
            <div className="flex-1 flex justify-between items-center">
              <span className="font-semibold text-gray-800 dark:text-gray-200">বন্ধুরা</span>
              {incomingRequests.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {incomingRequests.length}
                </span>
              )}
            </div>
          </div>
          <div 
            onClick={() => setShowFriendsList(true)}
            className="flex items-center gap-3 p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
          >
            <MessageSquare className="w-9 h-9 text-[#1D4ED8] dark:text-blue-500" />
            <div className="flex-1 flex justify-between items-center">
              <span className="font-semibold text-gray-800 dark:text-gray-200">মেসেজ</span>
              {totalUnreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-badge-pulse shadow-md">
                  {totalUnreadCount}
                </span>
              )}
            </div>
          </div>
          <div 
            onClick={onGoToChat}
            className="flex items-center gap-3 p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
          >
            <MessageSquare className="w-9 h-9 text-rose-500" />
            <div className="flex-1 flex justify-between items-center">
              <span className="font-semibold text-gray-800 dark:text-gray-200">বন্ধুদের সাথে গ্রুপ তৈরি করুন</span>
              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">Live</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors">
            <Video className="w-9 h-9 text-[#1D4ED8] dark:text-blue-500" />
            <span className="font-semibold text-gray-800 dark:text-gray-200">ভিডিও</span>
          </div>
          <div className="flex items-center gap-3 p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors">
            <ShoppingBag className="w-9 h-9 text-[#1D4ED8] dark:text-blue-500" />
            <span className="font-semibold text-gray-800 dark:text-gray-200">মার্কেটপ্লেস</span>
          </div>
          {userId === 'rkb@93' && (
            <div 
              onClick={() => setShowAdminPanel(true)}
              className="flex items-center gap-3 p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors text-red-600 dark:text-red-400"
            >
              <Shield className="w-9 h-9" />
              <span className="font-bold">অ্যাডমিন প্যানেল</span>
            </div>
          )}
        </aside>

        {/* Center Feed */}
        <div className="max-w-[680px] w-full space-y-4">
          {/* Create Post */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors">
            <div className="flex gap-3 mb-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                {userProfile?.profileImageUrl ? (
                  <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsCreatingPost(true)}
                className="bg-[#F0F2F5] dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-left px-4 py-2 rounded-full flex-1 transition-colors"
              >
                {getDisplayName(userId)}, আপনি এখন কী ভাবছেন?
              </button>
            </div>
            <hr className="border-gray-100 dark:border-gray-700 mb-3" />
            <div className="flex justify-between">
              <button className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors text-gray-600 dark:text-gray-300 font-semibold">
                <Video className="w-6 h-6 text-red-500" />
                লাইভ ভিডিও
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors text-gray-600 dark:text-gray-300 font-semibold"
              >
                <ImageIcon className="w-6 h-6 text-[#42B72A]" />
                ছবি/ভিডিও
              </button>
              <button className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors text-gray-600 dark:text-gray-300 font-semibold">
                <Heart className="w-6 h-6 text-yellow-500" />
                অনুভূতি/অ্যাক্টিভিটি
              </button>
            </div>
          </div>

          {/* Posts Feed */}
          <div className="space-y-4">
            {posts.length === 0 && optimisticPosts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700 transition-colors">
                <Users className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-400 dark:text-gray-500">এখনও কোনো পোস্ট নেই</h3>
                <p className="text-gray-400 dark:text-gray-500">বন্ধু যোগ করুন এবং তাদের পোস্ট দেখুন!</p>
              </div>
            ) : (
              [...optimisticPosts, ...posts].map((post) => (
                <div key={post.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors ${post.isOptimistic ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                  {post.isOptimistic && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-1 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">পোস্ট হচ্ছে...</span>
                    </div>
                  )}
                  {/* Post Header */}
                  <div className="p-4 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 dark:border-gray-700">
                        {allProfiles[post.userId]?.profileImageUrl ? (
                          <img src={allProfiles[post.userId].profileImageUrl} alt={post.userId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 
                          onClick={() => setViewingProfileId(post.userId)}
                          className="font-bold text-gray-900 dark:text-white hover:underline cursor-pointer"
                        >
                          {getDisplayName(post.userId)}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          {formatDistanceToNow(post.createdAt)} ago • <Users className="w-3 h-3" />
                        </p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                      <MoreHorizontal className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>

                  {/* Post Content */}
                  <div className="px-4 pb-3">
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{post.content}</p>
                  </div>

                  {/* Post Image */}
                  {post.imageUrl && (
                    <div className="border-y border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <img src={post.imageUrl} alt="Post" className="w-full max-h-[600px] object-contain mx-auto" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  {/* Post Video */}
                  {post.videoUrl && (
                    <div className="border-y border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <video 
                        src={post.videoUrl} 
                        controls 
                        className="w-full max-h-[600px] mx-auto"
                      />
                    </div>
                  )}

                  {/* Post Stats */}
                  <div className="px-4 py-2 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      {post.reactions && Object.keys(post.reactions).length > 0 && (
                        <div className="flex -space-x-1 items-center">
                          {Array.from(new Set(Object.values(post.reactions))).slice(0, 3).map((type, idx) => (
                            <span key={idx} className="text-xs">{getReactionEmoji(type as string)}</span>
                          ))}
                          <span className="ml-1 text-gray-500 dark:text-gray-400">{Object.keys(post.reactions).length}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <span>{post.replies?.length || 0} টি কমেন্ট</span>
                      <span>৫ টি শেয়ার</span>
                    </div>
                  </div>

                  <hr className="mx-4 border-gray-100 dark:border-gray-700" />

                  {/* Post Actions */}
                  <div className="px-4 py-1 flex justify-between relative">
                    <div 
                      className="flex-1 relative"
                      onMouseEnter={() => setHoveredPostId(post.id)}
                      onMouseLeave={() => setHoveredPostId(null)}
                    >
                      {hoveredPostId === post.id && (
                        <div className="absolute bottom-full left-0 pb-2 z-10">
                          <div className="bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded-full p-1 flex gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                        className={`w-full flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-semibold ${
                          post.reactions?.[userId] 
                            ? getReactionColor(post.reactions[userId] as string) 
                            : 'text-gray-600 dark:text-gray-300'
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
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300 font-semibold">
                      <MessageSquare className="w-5 h-5" />
                      কমেন্ট
                    </button>
                    <button 
                      onClick={() => setPostToShare(post)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300 font-semibold"
                    >
                      <Share2 className="w-5 h-5" />
                      শেয়ার
                    </button>
                  </div>

                  {/* Comments Section */}
                  {post.replies && post.replies.length > 0 && (
                    <div className="px-4 pb-4 space-y-3 mt-2">
                      {post.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          <div className="bg-[#F0F2F5] dark:bg-gray-700 p-2 px-3 rounded-2xl max-w-[90%]">
                            <p className="text-xs font-bold text-gray-900 dark:text-gray-200">{reply.isAdmin ? 'অ্যাডমিন' : getDisplayName(reply.userId)}</p>
                            <p className="text-sm text-gray-800 dark:text-gray-300">{reply.content}</p>
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
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 bg-[#F0F2F5] dark:bg-gray-700 rounded-2xl flex items-center px-3 transition-colors">
                      <input 
                        type="text" 
                        placeholder="কমেন্ট লিখুন..."
                        value={replyText[post.id] || ''}
                        onChange={(e) => setReplyText({ ...replyText, [post.id]: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && handleReply(post.id)}
                        className="bg-transparent border-none outline-none flex-1 py-1.5 text-sm dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <button 
                        onClick={() => handleReply(post.id)}
                        className="text-[#1D4ED8] dark:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded-full transition-colors"
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
                <h3 className="font-bold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">বর্তমান ফ্রেন্ড রিকোয়েস্ট</h3>
              </div>
              <div className="space-y-3 px-2">
                {incomingRequests.map((req) => (
                  <div key={req.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                        {allProfiles[req.fromUserId]?.profileImageUrl ? (
                          <img src={allProfiles[req.fromUserId].profileImageUrl} alt={req.fromUserId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{req.fromUserId}</span>
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
                        className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-1.5 rounded-md text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        বাতিল
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <hr className="border-gray-200 dark:border-gray-700 mx-2" />
            </div>
          )}

          <div className="flex justify-between items-center px-2">
            <h3 className="font-bold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">আপনার বন্ধুরা</h3>
            <div className="flex gap-2">
              <Search className="w-4 h-4 text-gray-500 dark:text-gray-400 cursor-pointer" />
              <MoreHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400 cursor-pointer" />
            </div>
          </div>
          
          <div className="space-y-1">
            {friends.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 px-2 italic">কোনো বন্ধু নেই</p>
            ) : (
              friends.map((friendId) => (
                <div 
                  key={friendId} 
                  className="flex items-center gap-3 p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors relative group"
                >
                  <div 
                    onClick={() => setViewingProfileId(friendId)}
                    className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 relative hover:scale-110 transition-transform"
                  >
                    {allProfiles[friendId]?.profileImageUrl ? (
                      <img src={allProfiles[friendId].profileImageUrl} alt={friendId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </div>
                    )}
                    {allProfiles[friendId]?.isOnline && (Date.now() - (allProfiles[friendId]?.lastSeen || 0) < 120000) && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <span 
                    onClick={() => setActiveChatFriend(friendId)}
                    className="font-semibold text-gray-800 dark:text-gray-200 flex-1 hover:text-[#1D4ED8] dark:hover:text-blue-400"
                  >
                    {friendId}
                  </span>
                  <div className="flex items-center gap-1">
                    {unreadCounts[friendId] > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-1 animate-badge-pulse shadow-sm">
                        {unreadCounts[friendId]}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnfriend(friendId);
                      }}
                      className="p-1.5 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="আনফ্রেন্ড করুন"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <hr className="border-gray-200 dark:border-gray-700 mx-2" />

          <div className="px-2">
            <button 
              onClick={() => setIsAddingFriend(true)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-200 font-bold"
            >
              <UserPlus className="w-5 h-5" />
              বন্ধু খুঁজুন
            </button>
          </div>
        </aside>
      </main>

      {/* Modals & Overlays */}
      {/* Share Post Modal */}
      {postToShare && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-10">
              <h3 className="font-bold text-lg dark:text-white">পোস্ট শেয়ার করুন</h3>
              <button 
                onClick={() => setPostToShare(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input 
                  type="text" 
                  placeholder="বন্ধুদের খুঁজুন..." 
                  value={shareSearchTerm}
                  onChange={(e) => setShareSearchTerm(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-700 dark:text-white pl-9 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="overflow-y-auto p-2 space-y-1 flex-1">
              {filteredFriendsForShare.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  কোনো বন্ধু পাওয়া যায়নি
                </div>
              ) : (
                filteredFriendsForShare.map(friendId => (
                  <div key={friendId} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                        {allProfiles[friendId]?.profileImageUrl ? (
                          <img src={allProfiles[friendId].profileImageUrl} alt={friendId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{getDisplayName(friendId)}</span>
                    </div>
                    <button 
                      onClick={() => handleSharePost(friendId)}
                      disabled={isSharing}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      পাঠান
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="fixed top-14 right-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-[60] max-h-[80vh] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-10">
            <h3 className="font-bold text-xl dark:text-white">নোটিফিকেশন</h3>
            <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-2">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">কোনো নোটিফিকেশন নেই</p>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-3 rounded-lg flex gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  onClick={() => markNotificationAsRead(n.id)}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    n.type === 'missed_call' ? 'bg-red-500' : 
                    n.type === 'request_accepted' ? 'bg-green-500' : 
                    'bg-blue-500'
                  }`}>
                    {n.type === 'missed_call' ? <PhoneOff className="w-6 h-6 text-white" /> : 
                     n.type === 'request_accepted' ? <UserPlus className="w-6 h-6 text-white" /> :
                     <Bell className="w-6 h-6 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm dark:text-gray-200 ${!n.read ? 'font-bold' : ''}`}>{n.message}</p>
                    <p className="text-xs text-[#1D4ED8] dark:text-blue-400 mt-1">{formatDistanceToNow(n.createdAt)} ago</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full h-fit transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {viewingProfileId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-[340px] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="relative h-24 bg-gradient-to-r from-gray-600 to-gray-800">
              <button 
                onClick={() => setViewingProfileId(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="px-5 pb-6">
              <div className="relative -mt-12 mb-3 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden shadow-lg bg-white dark:bg-gray-800">
                  {allProfiles[viewingProfileId]?.profileImageUrl ? (
                    <img src={allProfiles[viewingProfileId].profileImageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <User className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center mb-5">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{getDisplayName(viewingProfileId)}</h3>
                {allProfiles[viewingProfileId]?.bio && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm italic leading-tight">"{allProfiles[viewingProfileId].bio}"</p>
                )}
              </div>

              <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-[#1D4ED8] dark:text-blue-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase leading-none">অবস্থান</p>
                    <p className="text-sm font-medium">{allProfiles[viewingProfileId]?.location || 'উল্লেখ নেই'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase leading-none">জন্ম তারিখ</p>
                    <p className="text-sm font-medium">{allProfiles[viewingProfileId]?.birthDate || 'উল্লেখ নেই'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase leading-none">লিঙ্গ</p>
                    <p className="text-sm font-medium">{allProfiles[viewingProfileId]?.gender || 'উল্লেখ নেই'}</p>
                  </div>
                </div>
              </div>

              {viewingProfileId !== userId && !friends.includes(viewingProfileId) && (
                <button 
                  onClick={() => {
                    handleSendFriendRequestTo(viewingProfileId);
                    setViewingProfileId(null);
                  }}
                  disabled={sentRequests.some(r => r.toUserId === viewingProfileId)}
                  className={`w-full mt-5 font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${
                    sentRequests.some(r => r.toUserId === viewingProfileId)
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-[#1D4ED8] hover:bg-[#1a44c2] text-white shadow-lg shadow-blue-100'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  {sentRequests.some(r => r.toUserId === viewingProfileId) ? 'রিকোয়েস্ট সেন্ড করা হয়েছে' : 'ফ্রেন্ড রিকোয়েস্ট পাঠান'}
                </button>
              )}
              
              {friends.includes(viewingProfileId) && (
                <div className="space-y-2 mt-5">
                  <div className="w-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    আপনার বন্ধু
                  </div>
                  <button 
                    onClick={() => {
                      setActiveChatFriend(viewingProfileId);
                      setViewingProfileId(null);
                    }}
                    className="w-full bg-[#1D4ED8] dark:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-[#1a44c2] dark:hover:bg-blue-500 transition-all shadow-lg shadow-blue-100 dark:shadow-none"
                  >
                    <MessageSquare className="w-4 h-4" />
                    মেসেজ পাঠান
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        initiateCall(userId, viewingProfileId, 'audio');
                        setViewingProfileId(null);
                      }}
                      className="flex-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                    >
                      <Phone className="w-4 h-4" />
                      অডিও কল
                    </button>
                    <button 
                      onClick={() => {
                        initiateCall(userId, viewingProfileId, 'video');
                        setViewingProfileId(null);
                      }}
                      className="flex-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                    >
                      <Video className="w-4 h-4" />
                      ভিডিও কল
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showProfileView && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-[340px] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="relative h-24 bg-gradient-to-r from-blue-600 to-indigo-600">
              <button 
                onClick={() => setShowProfileView(false)}
                className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  setShowProfileView(false);
                  setIsEditingProfile(true);
                }}
                className="absolute top-3 left-3 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                title="প্রোফাইল এডিট করুন"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
            
            <div className="px-5 pb-6">
              <div className="relative -mt-12 mb-3 flex flex-col items-center">
                <div 
                  onClick={() => setShowFriendCount(!showFriendCount)}
                  className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden shadow-lg cursor-pointer hover:scale-105 transition-transform bg-white dark:bg-gray-800"
                >
                  {userProfile?.profileImageUrl ? (
                    <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <User className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center mb-5">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{getDisplayName(userId)}</h3>
                {userProfile?.statusMessage && (
                  <p className="text-[#1D4ED8] dark:text-blue-400 text-xs font-bold mt-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full inline-block">
                    {userProfile.statusMessage}
                  </p>
                )}
                {userProfile?.bio && (
                  <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm italic leading-tight">"{userProfile.bio}"</p>
                )}
                <div className="mt-3 inline-block bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                  <p className="text-xs font-bold text-[#1D4ED8] dark:text-blue-400">
                    সর্বমোট ফ্রেন্ড সংখ্যা: {friends.length}
                  </p>
                </div>
              </div>

              <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-[#1D4ED8] dark:text-blue-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase leading-none">অবস্থান</p>
                    <p className="text-sm font-medium">{userProfile?.location || 'উল্লেখ নেই'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase leading-none">জন্ম তারিখ</p>
                    <p className="text-sm font-medium">{userProfile?.birthDate || 'উল্লেখ নেই'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase leading-none">লিঙ্গ</p>
                    <p className="text-sm font-medium">{userProfile?.gender || 'উল্লেখ নেই'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase leading-none">পুশ নোটিফিকেশন</p>
                      <p className="text-sm font-medium">{userProfile?.fcmToken ? 'চালু আছে' : 'বন্ধ আছে'}</p>
                    </div>
                  </div>
                  {!userProfile?.fcmToken && (
                    <button 
                      onClick={() => requestNotificationPermission(userId)}
                      className="text-[10px] font-black text-[#1D4ED8] dark:text-blue-400 uppercase tracking-wider hover:underline"
                    >
                      চালু করুন
                    </button>
                  )}
                </div>
              </div>

              <button 
                onClick={onBack}
                className="w-full mt-5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                লগআউট
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-end">
          <div className="bg-white dark:bg-gray-800 h-full w-full max-w-md shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="font-bold text-2xl dark:text-white">প্রোফাইল এডিট করুন</h3>
              <button onClick={() => setIsEditingProfile(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Profile Image Section */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 dark:border-gray-700 shadow-lg">
                    {userProfile?.profileImageUrl ? (
                      <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <User className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => profileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-[#1D4ED8] dark:bg-blue-600 text-white rounded-full shadow-lg hover:bg-[#1a44c2] dark:hover:bg-blue-500 transition-all"
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
                <h4 className="mt-4 font-bold text-xl dark:text-white">{getDisplayName(userId)}</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm">আপনার প্রোফাইল তথ্য পরিবর্তন করুন</p>
                
                {/* Avatar Selection */}
                <div className="mt-4 w-full">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block text-left">অবতার নির্বাচন করুন (Choose Avatar)</label>
                  <div className="flex gap-3 overflow-x-auto pb-2 justify-center">
                    {['Felix', 'Aneka', 'Zoe', 'Max', 'Liam', 'Ava', 'Leo', 'Mia'].map((seed) => (
                      <div 
                        key={seed}
                        onClick={() => handleProfileImageChangeFromUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`)}
                        className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:border-[#1D4ED8] dark:hover:border-blue-500 transition-all flex-shrink-0 hover:scale-110"
                        title={seed}
                      >
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={seed} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">ডিসপ্লে নেম (Display Name)</label>
                  <input 
                    type="text" 
                    value={profileFormData.displayName}
                    onChange={(e) => setProfileFormData({ ...profileFormData, displayName: e.target.value })}
                    placeholder="আপনার নাম লিখুন"
                    className="w-full bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1D4ED8] dark:focus:ring-blue-500 transition-all placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">স্ট্যাটাস মেসেজ (Status)</label>
                  <input 
                    type="text" 
                    value={profileFormData.statusMessage}
                    onChange={(e) => setProfileFormData({ ...profileFormData, statusMessage: e.target.value })}
                    placeholder="আপনার বর্তমান অবস্থা (যেমন: ব্যস্ত, কাজে আছি)"
                    className="w-full bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1D4ED8] dark:focus:ring-blue-500 transition-all placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">বায়ো (Bio)</label>
                  <textarea 
                    value={profileFormData.bio}
                    onChange={(e) => setProfileFormData({ ...profileFormData, bio: e.target.value })}
                    placeholder="আপনার সম্পর্কে কিছু লিখুন..."
                    className="w-full bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl p-4 min-h-[120px] outline-none focus:ring-2 focus:ring-[#1D4ED8] dark:focus:ring-blue-500 transition-all resize-none placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">অবস্থান (Location)</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <input 
                      type="text" 
                      value={profileFormData.location}
                      onChange={(e) => setProfileFormData({ ...profileFormData, location: e.target.value })}
                      placeholder="আপনার শহর বা দেশ"
                      className="w-full bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#1D4ED8] dark:focus:ring-blue-500 transition-all placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">জন্ম তারিখ</label>
                    <input 
                      type="date" 
                      value={profileFormData.birthDate}
                      onChange={(e) => setProfileFormData({ ...profileFormData, birthDate: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1D4ED8] dark:focus:ring-blue-500 transition-all placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">লিঙ্গ (Gender)</label>
                    <select 
                      value={profileFormData.gender}
                      onChange={(e) => setProfileFormData({ ...profileFormData, gender: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1D4ED8] dark:focus:ring-blue-500 transition-all"
                    >
                      <option value="">নির্বাচন করুন</option>
                      <option value="male">পুরুষ</option>
                      <option value="female">মহিলা</option>
                      <option value="other">অন্যান্য</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                  >
                    বাতিল
                  </button>
                  <button 
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="flex-1 py-3 bg-[#1D4ED8] dark:bg-blue-600 text-white font-bold rounded-xl hover:bg-[#1a44c2] dark:hover:bg-blue-500 transition-all disabled:opacity-50"
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input 
                  type="text" 
                  placeholder="ইউজার আইডি লিখুন"
                  value={friendIdInput}
                  onChange={(e) => setFriendIdInput(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-700 dark:text-white pl-10 pr-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#1D4ED8] dark:focus:ring-blue-500"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-60 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                  {searchResults.map((resId) => (
                    <div key={resId} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-50 dark:border-gray-700 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                          {allProfiles[resId]?.profileImageUrl ? (
                            <img src={allProfiles[resId].profileImageUrl} alt={resId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{getDisplayName(resId)}</span>
                      </div>
                      <button 
                        onClick={() => handleSendFriendRequestTo(resId)}
                        disabled={sentRequests.some(r => r.toUserId === resId)}
                        className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${sentRequests.some(r => r.toUserId === resId) ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed' : 'bg-[#1D4ED8] dark:bg-blue-600 text-white hover:bg-[#1a44c2] dark:hover:bg-blue-500'}`}
                      >
                        {sentRequests.some(r => r.toUserId === resId) ? 'রিকোয়েস্ট সেন্ড' : 'রিকোয়েস্ট'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {friendIdInput && searchResults.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-2">কোনো ইউজার পাওয়া যায়নি</p>
              )}

              <button 
                onClick={handleSendFriendRequest}
                className="w-full bg-[#1D4ED8] dark:bg-blue-600 hover:bg-[#1a44c2] dark:hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all"
              >
                সরাসরি রিকোয়েস্ট পাঠান
              </button>

              {suggestedFriends.length > 0 && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-3 tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4" /> আপনার জন্য সাজেশন
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {suggestedFriends.map((suggestion) => (
                      <div key={suggestion.userId} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 dark:border-gray-700">
                            {allProfiles[suggestion.userId]?.profileImageUrl ? (
                              <img src={allProfiles[suggestion.userId].profileImageUrl} alt={suggestion.userId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">{getDisplayName(suggestion.userId)}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-1 mt-0.5">
                              {suggestion.mutualCount > 0 && (
                                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
                                  {suggestion.mutualCount} জন মিউচুয়াল বন্ধু
                                </span>
                              )}
                              {suggestion.commonInterests.map(interest => (
                                <span key={interest} className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">
                                  #{interest}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleSendFriendRequestTo(suggestion.userId)}
                          className="p-2 bg-blue-50 dark:bg-blue-900/30 text-[#1D4ED8] dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          title="রিকোয়েস্ট পাঠান"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {incomingRequests.length > 0 && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h4 className="font-bold mb-3 dark:text-white">আগত রিকোয়েস্ট</h4>
                  <div className="space-y-3">
                    {incomingRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                          </div>
                          <span className="font-bold dark:text-gray-200">{getDisplayName(req.fromUserId)}</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => respondToFriendRequest(req.id, 'accepted', req.fromUserId, req.toUserId)}
                            className="bg-[#1D4ED8] dark:bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-bold"
                          >
                            গ্রহণ
                          </button>
                          <button 
                            onClick={() => respondToFriendRequest(req.id, 'rejected', req.fromUserId, req.toUserId)}
                            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-1.5 rounded-md text-sm font-bold"
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

      {showFriendsList && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-end">
          <div className="bg-white dark:bg-gray-800 h-full w-full max-w-xs shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-xl dark:text-white">আপনার বন্ধুরা</h3>
              <button onClick={() => setShowFriendsList(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {incomingRequests.length > 0 && (
                <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                  <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase mb-3 ml-2 tracking-wider">আগত ফ্রেন্ড রিকোয়েস্ট ({incomingRequests.length})</h4>
                  <div className="space-y-2">
                    {incomingRequests.map((req) => (
                      <div key={req.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-blue-50 dark:border-blue-900/50 flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 dark:border-gray-700">
                            {allProfiles[req.fromUserId]?.profileImageUrl ? (
                              <img src={allProfiles[req.fromUserId].profileImageUrl} alt={req.fromUserId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                              </div>
                            )}
                          </div>
                          <span className="font-bold text-gray-800 dark:text-gray-200">{getDisplayName(req.fromUserId)}</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => respondToFriendRequest(req.id, 'accepted', req.fromUserId, req.toUserId)}
                            className="flex-1 bg-[#1D4ED8] dark:bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-[#1a44c2] dark:hover:bg-blue-500 transition-colors"
                          >
                            গ্রহণ করুন
                          </button>
                          <button 
                            onClick={() => respondToFriendRequest(req.id, 'rejected', req.fromUserId, req.toUserId)}
                            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            বাতিল
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 ml-2 tracking-wider">আপনার বন্ধুরা</h4>
              {friends.length === 0 && incomingRequests.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8 italic">কোনো বন্ধু নেই</p>
              ) : (
                friends.map((friendId) => (
                  <div 
                    key={friendId} 
                    className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors relative group"
                  >
                    <div 
                      onClick={() => {
                        setViewingProfileId(friendId);
                        setShowFriendsList(false);
                      }}
                      className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 relative hover:scale-105 transition-transform"
                    >
                      {allProfiles[friendId]?.profileImageUrl ? (
                        <img src={allProfiles[friendId].profileImageUrl} alt={friendId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        </div>
                      )}
                      {allProfiles[friendId]?.isOnline && (Date.now() - (allProfiles[friendId]?.lastSeen || 0) < 120000) && (
                        <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 dark:bg-green-400 border-2 border-white dark:border-gray-800 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    <div 
                      className="flex-1"
                      onClick={() => {
                        setViewingProfileId(friendId);
                        setShowFriendsList(false);
                      }}
                    >
                      <p className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-[#1D4ED8] dark:group-hover:text-blue-400 transition-colors">{getDisplayName(friendId)}</p>
                      {allProfiles[friendId]?.location && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{allProfiles[friendId].location}</p>
                      )}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveChatFriend(friendId);
                        setShowFriendsList(false);
                      }}
                      className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full transition-colors"
                      title="মেসেজ পাঠান"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        initiateCall(userId, friendId, 'audio');
                        setShowFriendsList(false);
                      }}
                      className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full transition-colors"
                      title="অডিও কল"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        initiateCall(userId, friendId, 'video');
                        setShowFriendsList(false);
                      }}
                      className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full transition-colors"
                      title="ভিডিও কল"
                    >
                      <Video className="w-5 h-5" />
                    </button>
                    {unreadCounts[friendId] > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-badge-pulse shadow-sm">
                        {unreadCounts[friendId]}
                      </span>
                    )}
                  </div>
                ))
              )}
              {suggestedFriends.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-xs font-black text-gray-400 uppercase mb-4 ml-2 tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4" /> আপনার জন্য সাজেশন
                  </h4>
                  <div className="space-y-3">
                    {suggestedFriends.slice(0, 5).map((suggestion) => (
                      <div key={suggestion.userId} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100">
                            {allProfiles[suggestion.userId]?.profileImageUrl ? (
                              <img src={allProfiles[suggestion.userId].profileImageUrl} alt={suggestion.userId} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800 text-sm">{suggestion.userId}</div>
                            <div className="text-[9px] text-gray-500">
                              {suggestion.mutualCount > 0 ? `${suggestion.mutualCount} জন মিউচুয়াল বন্ধু` : suggestion.commonInterests.length > 0 ? `#${suggestion.commonInterests[0]}` : 'নতুন বন্ধু'}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleSendFriendRequestTo(suggestion.userId)}
                          className="p-2 bg-blue-50 text-[#1D4ED8] rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
              <button 
                onClick={() => {
                  setIsAddingFriend(true);
                  setShowFriendsList(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#1D4ED8] dark:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-[#1a44c2] dark:hover:bg-blue-500 transition-all"
              >
                <UserPlus className="w-5 h-5" />
                নতুন বন্ধু খুঁজুন
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdminPanel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Admin Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-2xl text-red-600 dark:text-red-400">
                  <Shield className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">অ্যাডমিন প্যানেল</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">ইউজার ম্যানেজমেন্ট ও রেজিস্ট্রেশন তথ্য</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAdminPanel(false)}
                className="p-3 hover:bg-white dark:hover:bg-gray-700 rounded-2xl transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Admin Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-6">
              <button 
                onClick={() => setAdminTab('accounts')}
                className={`py-4 px-6 font-bold text-sm transition-all border-b-2 ${adminTab === 'accounts' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                ইউজার অ্যাকাউন্টস ({userAccounts.length})
              </button>
              <button 
                onClick={() => setAdminTab('requests')}
                className={`py-4 px-6 font-bold text-sm transition-all border-b-2 ${adminTab === 'requests' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                রেজিস্ট্রেশন রিকোয়েস্ট ({registrationRequests.filter(r => r.status === 'pending').length})
              </button>
            </div>

            {/* Admin Search */}
            <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-50 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input 
                  type="text"
                  placeholder={adminTab === 'accounts' ? "ইউজার আইডি বা মোবাইল নম্বর দিয়ে খুঁজুন..." : "নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."}
                  value={adminSearchTerm}
                  onChange={(e) => setAdminSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/50 transition-all text-gray-800 dark:text-white font-medium placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50/30 dark:bg-gray-900/30">
              <div className="grid gap-4">
                {adminTab === 'accounts' ? (
                  userAccounts
                    .filter(acc => 
                      (acc.userId || '').toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
                      (acc.mobile || '').includes(adminSearchTerm)
                    )
                    .map((acc) => (
                      <div key={acc.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl">
                            {(acc.userId || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-gray-900 dark:text-white text-lg">{acc.userId}</span>
                              <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">User</span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                <Phone className="w-3.5 h-3.5" />
                                <span className="font-medium">{acc.mobile}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                <Lock className="w-3.5 h-3.5" />
                                <span className="font-mono bg-gray-50 dark:bg-gray-700 px-1.5 rounded border border-gray-100 dark:border-gray-600">{acc.password}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingAccount(acc)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            এডিট
                          </button>
                          <button 
                            onClick={async () => {
                              if (window.confirm(`${acc.userId} কে ডিলিট করতে চান?`)) {
                                try {
                                  await deleteUserAccount(acc.id, acc.userId);
                                  alert('ইউজার ডিলিট হয়েছে।');
                                } catch (e) {
                                  alert('ডিলিট করতে সমস্যা হয়েছে।');
                                }
                              }
                            }}
                            className="p-2.5 text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  registrationRequests
                    .filter(req => 
                      (req.name || '').toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
                      (req.mobile || '').includes(adminSearchTerm)
                    )
                    .map((req) => (
                      <div key={req.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${req.status === 'approved' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                            {(req.name || 'R').charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-gray-900 dark:text-white text-lg">{req.name}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${req.status === 'approved' ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400'}`}>
                                {req.status === 'approved' ? 'Approved' : 'Pending'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                <Phone className="w-3.5 h-3.5" />
                                <span className="font-medium">{req.mobile}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                <Bell className="w-3.5 h-3.5" />
                                <span className="text-xs">{req.email}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {req.status === 'pending' && (
                          <button 
                            onClick={() => {
                              // This would normally open the approval modal
                              // For now, we'll just show the ID if assigned
                              alert('এই রিকোয়েস্টটি অ্যাপ্রুভ করতে মেইন ড্যাশবোর্ড ব্যবহার করুন।');
                            }}
                            className="px-4 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
                          >
                            অ্যাপ্রুভ করুন
                          </button>
                        )}
                      </div>
                    ))
                )}
                
                {((adminTab === 'accounts' && userAccounts.length === 0) || (adminTab === 'requests' && registrationRequests.length === 0)) && (
                  <div className="text-center py-20">
                    <Users className="w-20 h-20 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-400 dark:text-gray-500 font-bold text-xl">কোনো তথ্য পাওয়া যায়নি</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20">
              <h3 className="text-xl font-black text-gray-900 dark:text-white">ইউজার তথ্য পরিবর্তন</h3>
              <button onClick={() => setEditingAccount(null)} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-400 dark:text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const userId = formData.get('userId') as string;
                const mobile = formData.get('mobile') as string;
                const password = formData.get('password') as string;

                try {
                  await updateUserAccount(editingAccount.id, editingAccount.userId, { userId, mobile, password });
                  alert('তথ্য আপডেট হয়েছে।');
                  setEditingAccount(null);
                } catch (err) {
                  alert('আপডেট করতে সমস্যা হয়েছে।');
                }
              }}
              className="p-6 space-y-4"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">ইউজার আইডি</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input 
                    name="userId"
                    defaultValue={editingAccount.userId}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50 font-bold text-gray-800 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">মোবাইল নম্বর</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input 
                    name="mobile"
                    defaultValue={editingAccount.mobile}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50 font-bold text-gray-800 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">পাসওয়ার্ড</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input 
                    name="password"
                    defaultValue={editingAccount.password}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50 font-bold text-gray-800 dark:text-white"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-[#1D4ED8] dark:bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all mt-4 hover:bg-[#1a44c2] dark:hover:bg-blue-500"
              >
                তথ্য সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {isCreatingPost && (
        <div className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-[500px] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-xl text-center flex-1 dark:text-white">পোস্ট তৈরি করুন</h3>
              <button onClick={() => setIsCreatingPost(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 dark:border-gray-700">
                  {userProfile?.profileImageUrl ? (
                    <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{getDisplayName(userId)}</p>
                  <div className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded flex items-center gap-1 text-xs font-bold w-fit text-gray-600 dark:text-gray-300">
                    <Users className="w-3 h-3" /> বন্ধুরা
                  </div>
                </div>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`${getDisplayName(userId)}, আপনি এখন কী ভাবছেন?`}
                className="w-full min-h-[150px] text-xl outline-none resize-none placeholder-gray-500 dark:placeholder-gray-400 bg-transparent dark:text-white"
              />

              {selectedImage && (
                <div className="relative mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img src={selectedImage} alt="Selected" className="w-full max-h-[300px] object-cover" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => {
                      setSelectedImage(null);
                      setSelectedFile(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {selectedVideo && (
                <div className="relative mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <video src={selectedVideo} controls className="w-full max-h-[300px] object-cover" />
                  <button 
                    onClick={() => {
                      setSelectedVideo(null);
                      setSelectedFile(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div className="mt-4 p-3 border border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-between">
                <span className="font-semibold text-gray-700 dark:text-gray-300">আপনার পোস্টে যোগ করুন</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <ImageIcon className="w-6 h-6 text-[#42B72A]" />
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <Video className="w-6 h-6 text-red-500" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <UserPlus className="w-6 h-6 text-[#1D4ED8] dark:text-blue-400" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <Heart className="w-6 h-6 text-yellow-500" />
                  </button>
                </div>
                <input type="file" accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !message.trim()}
                className={`w-full mt-4 py-2 rounded-lg font-bold text-white transition-all relative overflow-hidden ${
                  isSubmitting || !message.trim() ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500 dark:text-gray-500' : 'bg-[#1D4ED8] dark:bg-blue-600 hover:bg-[#1a44c2] dark:hover:bg-blue-500'
                }`}
              >
                {uploadProgress !== null && (
                  <div 
                    className="absolute inset-0 bg-blue-700/30 dark:bg-blue-400/30 transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }} 
                  />
                )}
                <span className="relative z-10">
                  {isSubmitting ? (uploadProgress !== null ? `আপলোড হচ্ছে ${Math.round(uploadProgress)}%...` : 'পোস্ট হচ্ছে...') : 'পোস্ট করুন'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isUpdatingProfile && (
        <div className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-xl dark:text-white">প্রোফাইল আপডেট</h3>
              <button onClick={() => setIsUpdatingProfile(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-center space-y-6">
              <div className="relative inline-block group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#1D4ED8] dark:border-blue-500 bg-gray-100 dark:bg-gray-700">
                  {userProfile?.profileImageUrl ? (
                    <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 text-gray-300 dark:text-gray-500" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => profileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 bg-[#1D4ED8] dark:bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-[#1a44c2] dark:hover:bg-blue-500 transition-all"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input type="file" accept="image/*" className="hidden" ref={profileInputRef} onChange={handleProfileImageChange} />
              </div>
              <div>
                <h2 className="text-2xl font-bold dark:text-white">{getDisplayName(userId)}</h2>
                <p className="text-gray-500 dark:text-gray-400">আপনার প্রোফাইল ছবি পরিবর্তন করুন</p>
              </div>
              <button 
                onClick={() => setIsUpdatingProfile(false)}
                className="w-full bg-[#1D4ED8] dark:bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-[#1a44c2] dark:hover:bg-blue-500 transition-colors"
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

      {activeCall && (
        <CallWindow 
          userId={userId} 
          call={activeCall} 
          friendProfile={allProfiles[activeCall.fromUserId === userId ? activeCall.toUserId : activeCall.fromUserId] || null}
          onClose={() => setActiveCall(null)}
        />
      )}
    </div>
  );
};

export default BlogSystem;
