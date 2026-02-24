
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, Timestamp, where, deleteDoc, getDocs, deleteField } from 'firebase/firestore';
import { Post, Reply, RegistrationRequest, FriendRequest, ChatMessage, Notification, UserProfile, UserAccount } from '../types';

// These should be replaced with actual config from user later
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAT5Ts59hVLT5SFUfxTBpp4Elcp5tYDAKg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "secretmessage-dc606.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "secretmessage-dc606",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "secretmessage-dc606.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "620607164946",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:620607164946:web:56c0ec48b4347ceb063ecb"
};

if (!firebaseConfig.apiKey) {
  console.warn("Firebase API Key is missing. Please set VITE_FIREBASE_API_KEY in environment variables.");
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const isFirebaseConfigured = !!firebaseConfig.apiKey;

const POSTS_COLLECTION = 'posts';
const REGISTRATION_COLLECTION = 'registration_requests';
const FRIEND_REQUESTS_COLLECTION = 'friend_requests';
const CHAT_MESSAGES_COLLECTION = 'chat_messages';
const NOTIFICATIONS_COLLECTION = 'notifications';
const USER_PROFILES_COLLECTION = 'user_profiles';
const USER_ACCOUNTS_COLLECTION = 'user_accounts';

export const createPost = async (userId: string, content: string, imageUrl?: string) => {
  try {
    await addDoc(collection(db, POSTS_COLLECTION), {
      userId,
      content,
      imageUrl: imageUrl || null,
      createdAt: Date.now(),
      replies: []
    });
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};

export const subscribeToPosts = (callback: (posts: Post[]) => void, filterUserId?: string) => {
  let q = query(collection(db, POSTS_COLLECTION), orderBy('createdAt', 'desc'));
  
  if (filterUserId) {
    q = query(
      collection(db, POSTS_COLLECTION), 
      where('userId', '==', filterUserId),
      orderBy('createdAt', 'desc')
    );
  }

  let unsubscribeFallback: (() => void) | null = null;

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Post[];
    callback(posts);
  }, (error) => {
    console.error("Snapshot error:", error);
    // If index is missing (failed-precondition), fallback to client-side filtering
    if (error.code === 'failed-precondition' && filterUserId) {
      console.warn("Firestore index missing for filtered query. Falling back to client-side filtering.");
      const fallbackQ = query(collection(db, POSTS_COLLECTION));
      unsubscribeFallback = onSnapshot(fallbackQ, (snapshot) => {
        const posts = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Post))
          .filter(p => p.userId === filterUserId)
          .sort((a, b) => b.createdAt - a.createdAt);
        callback(posts);
      });
    }
  });

  return () => {
    unsubscribe();
    if (unsubscribeFallback) unsubscribeFallback();
  };
};

export const addReply = async (postId: string, content: string, isAdmin: boolean) => {
  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    const reply: Reply = {
      id: Math.random().toString(36).substr(2, 9),
      content,
      createdAt: Date.now(),
      isAdmin
    };
    await updateDoc(postRef, {
      replies: arrayUnion(reply)
    });
  } catch (error) {
    console.error("Error adding reply:", error);
    throw error;
  }
};

export const toggleReaction = async (postId: string, userId: string, reactionType: string) => {
  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    await updateDoc(postRef, {
      [`reactions.${userId}`]: reactionType
    });
  } catch (error) {
    console.error("Error toggling reaction:", error);
    throw error;
  }
};

export const removeReaction = async (postId: string, userId: string) => {
  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    await updateDoc(postRef, {
      [`reactions.${userId}`]: deleteField()
    });
  } catch (error) {
    console.error("Error removing reaction:", error);
    throw error;
  }
};

export const deletePost = async (postId: string) => {
  if (!postId) {
    console.error("Delete failed: No postId provided");
    return;
  }
  try {
    console.log("Firestore: Deleting document", postId);
    const postRef = doc(db, POSTS_COLLECTION, postId);
    await deleteDoc(postRef);
    console.log("Firestore: Document deleted", postId);
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
};

export const createRegistrationRequest = async (name: string, mobile: string, email: string) => {
  try {
    await addDoc(collection(db, REGISTRATION_COLLECTION), {
      name,
      mobile,
      email,
      status: 'pending',
      createdAt: Date.now()
    });
  } catch (error) {
    console.error("Error creating registration request:", error);
    throw error;
  }
};

export const subscribeToRegistrationRequests = (callback: (requests: RegistrationRequest[]) => void) => {
  const q = query(collection(db, REGISTRATION_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as RegistrationRequest[];
    callback(requests);
  });
};

export const assignUserIdToRequest = async (requestId: string, assignedUserId: string) => {
  try {
    const requestRef = doc(db, REGISTRATION_COLLECTION, requestId);
    await updateDoc(requestRef, {
      assignedUserId,
      status: 'approved'
    });
  } catch (error) {
    console.error("Error assigning userId:", error);
    throw error;
  }
};

export const subscribeToApprovedUserIds = (callback: (userIds: string[]) => void) => {
  const q = query(collection(db, REGISTRATION_COLLECTION), where('status', '==', 'approved'));
  return onSnapshot(q, (snapshot) => {
    const userIds = snapshot.docs
      .map(doc => (doc.data() as RegistrationRequest).assignedUserId)
      .filter((id): id is string => !!id);
    callback(userIds);
  });
};

export const sendFriendRequest = async (fromUserId: string, toUserId: string) => {
  try {
    await addDoc(collection(db, FRIEND_REQUESTS_COLLECTION), {
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: Date.now()
    });
    await createNotification(toUserId, fromUserId, 'request_accepted', `${fromUserId} তোমাকে ফ্রেন্ড রিকোয়েস্ট পাঠিয়েছে!`);
  } catch (error) {
    console.error("Error sending friend request:", error);
    throw error;
  }
};

export const subscribeToSentFriendRequests = (userId: string, callback: (requests: FriendRequest[]) => void) => {
  const q = query(
    collection(db, FRIEND_REQUESTS_COLLECTION), 
    where('fromUserId', '==', userId),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FriendRequest[];
    callback(requests);
  });
};

export const subscribeToIncomingFriendRequests = (userId: string, callback: (requests: FriendRequest[]) => void) => {
  const q = query(
    collection(db, FRIEND_REQUESTS_COLLECTION), 
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FriendRequest[];
    callback(requests);
  });
};

export const respondToFriendRequest = async (requestId: string, status: 'accepted' | 'rejected', fromUserId?: string, toUserId?: string) => {
  try {
    const requestRef = doc(db, FRIEND_REQUESTS_COLLECTION, requestId);
    await updateDoc(requestRef, { status });

    if (status === 'accepted' && fromUserId && toUserId) {
      await createNotification(fromUserId, toUserId, 'request_accepted', `${toUserId} তোমার ফ্রেন্ড রিকোয়েস্ট গ্রহণ করেছে!`);
    }
  } catch (error) {
    console.error("Error responding to friend request:", error);
    throw error;
  }
};

export const unfriend = async (userId: string, friendId: string) => {
  try {
    const q1 = query(collection(db, FRIEND_REQUESTS_COLLECTION), where('fromUserId', '==', userId), where('toUserId', '==', friendId), where('status', '==', 'accepted'));
    const q2 = query(collection(db, FRIEND_REQUESTS_COLLECTION), where('fromUserId', '==', friendId), where('toUserId', '==', userId), where('status', '==', 'accepted'));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const docsToDelete = [...snap1.docs, ...snap2.docs];
    
    for (const d of docsToDelete) {
      await deleteDoc(doc(db, FRIEND_REQUESTS_COLLECTION, d.id));
    }

    await createNotification(friendId, userId, 'unfriended', `${userId} তোমাকে আনফ্রেন্ড করেছে।`);
  } catch (error) {
    console.error("Error unfriending:", error);
    throw error;
  }
};

export const sendChatMessage = async (fromUserId: string, toUserId: string, content: string, imageUrl?: string) => {
  try {
    await addDoc(collection(db, CHAT_MESSAGES_COLLECTION), {
      fromUserId,
      toUserId,
      content,
      imageUrl: imageUrl || null,
      read: false,
      createdAt: Date.now()
    });
    // Optional: Add notification for new message
  } catch (error) {
    console.error("Error sending chat message:", error);
    throw error;
  }
};

export const markMessagesAsRead = async (userId: string, friendId: string) => {
  try {
    const q = query(
      collection(db, CHAT_MESSAGES_COLLECTION),
      where('toUserId', '==', userId),
      where('fromUserId', '==', friendId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(d => updateDoc(doc(db, CHAT_MESSAGES_COLLECTION, d.id), { read: true }));
    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }
};

export const subscribeToUnreadMessageCounts = (userId: string, callback: (counts: { [friendId: string]: number }) => void) => {
  const q = query(
    collection(db, CHAT_MESSAGES_COLLECTION),
    where('toUserId', '==', userId),
    where('read', '==', false)
  );
  
  return onSnapshot(q, (snapshot) => {
    const counts: { [friendId: string]: number } = {};
    snapshot.docs.forEach(doc => {
      const msg = doc.data() as ChatMessage;
      counts[msg.fromUserId] = (counts[msg.fromUserId] || 0) + 1;
    });
    callback(counts);
  });
};

export const subscribeToChat = (userId1: string, userId2: string, callback: (messages: ChatMessage[]) => void) => {
  const q = query(collection(db, CHAT_MESSAGES_COLLECTION), orderBy('createdAt', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage))
      .filter(m => (m.fromUserId === userId1 && m.toUserId === userId2) || (m.fromUserId === userId2 && m.toUserId === userId1));
    callback(messages);
  });
};

export const createNotification = async (toUserId: string, fromUserId: string, type: Notification['type'], message: string) => {
  try {
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      toUserId,
      fromUserId,
      type,
      message,
      read: false,
      createdAt: Date.now()
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  const q = query(collection(db, NOTIFICATIONS_COLLECTION), where('toUserId', '==', userId), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
    callback(notifications);
  });
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const ref = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(ref, { read: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

export const deleteNotification = async (notificationId: string) => {
  try {
    await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId));
  } catch (error) {
    console.error("Error deleting notification:", error);
  }
};

export const subscribeToFriends = (userId: string, callback: (friendIds: string[]) => void) => {
  // Friends are those where (fromUserId == userId OR toUserId == userId) AND status == 'accepted'
  const q1 = query(
    collection(db, FRIEND_REQUESTS_COLLECTION),
    where('fromUserId', '==', userId),
    where('status', '==', 'accepted')
  );
  const q2 = query(
    collection(db, FRIEND_REQUESTS_COLLECTION),
    where('toUserId', '==', userId),
    where('status', '==', 'accepted')
  );

  let friends1: string[] = [];
  let friends2: string[] = [];

  const unsub1 = onSnapshot(q1, (snapshot) => {
    friends1 = snapshot.docs.map(doc => (doc.data() as FriendRequest).toUserId);
    callback([...new Set([...friends1, ...friends2])]);
  });

  const unsub2 = onSnapshot(q2, (snapshot) => {
    friends2 = snapshot.docs.map(doc => (doc.data() as FriendRequest).fromUserId);
    callback([...new Set([...friends1, ...friends2])]);
  });

  return () => {
    unsub1();
    unsub2();
  };
};

export const subscribeToAllVisiblePosts = (userId: string, friendIds: string[], callback: (posts: Post[]) => void) => {
  // Posts visible to user: their own posts + friends' posts
  const allUserIds = [userId, ...friendIds];
  
  // Firestore 'in' query supports up to 10 elements. 
  // For simplicity, we'll fetch all and filter client-side if friend list is small, 
  // or just fetch all posts if it's a small app.
  // Given the "Secret Message" nature, let's just fetch all and filter.
  const q = query(collection(db, POSTS_COLLECTION), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Post))
      .filter(post => allUserIds.includes(post.userId));
    callback(posts);
  });
};

export const checkUserIdExists = async (userId: string): Promise<boolean> => {
  // Check database
  const q = query(
    collection(db, USER_ACCOUNTS_COLLECTION), 
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

export const checkMobileExists = async (mobile: string): Promise<boolean> => {
  const q = query(
    collection(db, USER_ACCOUNTS_COLLECTION), 
    where('mobile', '==', mobile)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

export const registerUser = async (userId: string, password: string, mobile: string) => {
  try {
    await addDoc(collection(db, USER_ACCOUNTS_COLLECTION), {
      userId,
      password,
      mobile,
      createdAt: Date.now()
    });
    // Create an initial profile
    await addDoc(collection(db, USER_PROFILES_COLLECTION), {
      userId,
      profileImageUrl: null,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};

export const subscribeToAllUserIds = (callback: (userIds: string[]) => void) => {
  const q = query(collection(db, USER_ACCOUNTS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const ids = snapshot.docs.map(doc => doc.data().userId);
    callback(ids);
  });
};

export const loginUser = async (userId: string, password: string): Promise<boolean> => {
  // Hardcoded Admin check
  if (userId === 'rkb@93' && password === 'rkb@80') return true;
  // User requested sumi52 password
  if (userId === 'sumi52' && password === 'sumi52') return true;

  const q = query(
    collection(db, USER_ACCOUNTS_COLLECTION), 
    where('userId', '==', userId),
    where('password', '==', password)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

export const resetUserPassword = async (userId: string, mobile: string, newPassword: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, USER_ACCOUNTS_COLLECTION), 
      where('userId', '==', userId),
      where('mobile', '==', mobile)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return false;
    
    const docRef = doc(db, USER_ACCOUNTS_COLLECTION, snapshot.docs[0].id);
    await updateDoc(docRef, { password: newPassword });
    return true;
  } catch (error) {
    console.error("Error resetting password:", error);
    throw error;
  }
};

export const subscribeToUserProfile = (userId: string, callback: (profile: UserProfile | null) => void) => {
  const q = query(collection(db, USER_PROFILES_COLLECTION), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      callback(snapshot.docs[0].data() as UserProfile);
    }
  });
};

export const subscribeToAllUserProfiles = (callback: (profiles: { [userId: string]: UserProfile }) => void) => {
  const q = query(collection(db, USER_PROFILES_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const profiles: { [userId: string]: UserProfile } = {};
    snapshot.docs.forEach(doc => {
      const p = doc.data() as UserProfile;
      profiles[p.userId] = p;
    });
    callback(profiles);
  });
};

export const updateUserProfile = async (userId: string, data: Partial<UserProfile>) => {
  try {
    const q = query(collection(db, USER_PROFILES_COLLECTION), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      await addDoc(collection(db, USER_PROFILES_COLLECTION), {
        userId,
        ...data,
        updatedAt: Date.now()
      });
    } else {
      const docRef = doc(db, USER_PROFILES_COLLECTION, snapshot.docs[0].id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Date.now()
      });
    }
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};
