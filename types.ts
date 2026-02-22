
export interface Post {
  id: string;
  userId: string;
  content: string;
  createdAt: number;
  replies?: Reply[];
}

export interface Reply {
  id: string;
  content: string;
  createdAt: number;
  isAdmin: boolean;
}

export interface RegistrationRequest {
  id: string;
  name: string;
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

export enum AppState {
  LOCKED = 'LOCKED',
  UNLOCKING = 'UNLOCKING',
  UNLOCKED = 'UNLOCKED',
  DECOY_REJECTED = 'DECOY_REJECTED',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  REGISTRATION = 'REGISTRATION'
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}
