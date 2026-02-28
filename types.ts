
export interface Post {
  id: string;
  userId: string;
  content: string;
  imageUrl?: string;
  createdAt: number;
  replies?: Reply[];
  reactions?: { [userId: string]: string };
}

export interface Reply {
  id: string;
  userId: string;
  content: string;
  createdAt: number;
  isAdmin: boolean;
}

export interface RegistrationRequest {
  id: string;
  name: string;
  displayName: string;
  mobile: string;
  email: string;
  status: 'pending' | 'approved';
  assignedUserId?: string;
  createdAt: number;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  imageUrl?: string;
  read: boolean;
  createdAt: number;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  profileImageUrl?: string;
  bio?: string;
  location?: string;
  birthDate?: string;
  gender?: string;
  fcmToken?: string;
  updatedAt: number;
}

export interface Notification {
  id: string;
  toUserId: string;
  fromUserId: string;
  type: 'request_accepted' | 'unfriended' | 'new_message' | 'missed_call';
  message: string;
  read: boolean;
  createdAt: number;
}

export interface Call {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended';
  createdAt: number;
  endedAt?: number;
}

export interface CallSignal {
  id: string;
  type: 'offer' | 'answer' | 'candidate';
  data: any;
  fromUserId: string;
  createdAt: number;
}

export interface UserAccount {
  id: string;
  userId: string;
  displayName: string;
  password: string;
  mobile: string;
  createdAt: number;
}

export enum AppState {
  LOCKED = 'LOCKED',
  UNLOCKING = 'UNLOCKING',
  UNLOCKED = 'UNLOCKED',
  DECOY_REJECTED = 'DECOY_REJECTED',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  REGISTRATION = 'REGISTRATION',
  PASSWORD_RESET = 'PASSWORD_RESET'
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}
