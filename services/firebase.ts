
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, Timestamp, where, deleteDoc, getDocs } from 'firebase/firestore';
import { Post, Reply, RegistrationRequest, FriendRequest } from '../types';

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

export const createPost = async (userId: string, content: string) => {
  try {
    await addDoc(collection(db, POSTS_COLLECTION), {
      userId,
      content,
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
    // Check if request already exists
    await addDoc(collection(db, FRIEND_REQUESTS_COLLECTION), {
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: Date.now()
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    throw error;
  }
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

export const respondToFriendRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
  try {
    const requestRef = doc(db, FRIEND_REQUESTS_COLLECTION, requestId);
    await updateDoc(requestRef, { status });
  } catch (error) {
    console.error("Error responding to friend request:", error);
    throw error;
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
  // Hardcoded valid IDs
  const HARDCODED_IDS = ['auntora93', 'Auntora93', 'sumi52', 'rkb@93', 'loveadmin'];
  if (HARDCODED_IDS.includes(userId)) return true;

  // Check database
  const q = query(
    collection(db, REGISTRATION_COLLECTION), 
    where('assignedUserId', '==', userId),
    where('status', '==', 'approved')
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};
