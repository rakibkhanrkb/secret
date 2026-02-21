
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

export enum AppState {
  LOCKED = 'LOCKED',
  UNLOCKING = 'UNLOCKING',
  UNLOCKED = 'UNLOCKED',
  DECOY_REJECTED = 'DECOY_REJECTED',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD'
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}
