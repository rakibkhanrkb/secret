
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, Timestamp, where, deleteDoc } from 'firebase/firestore';
import { Post, Reply } from '../types';

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
