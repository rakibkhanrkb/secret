
export interface GeminiResponse {
  poem: string;
  wishes: string[];
}

export enum AppState {
  LOCKED = 'LOCKED',
  UNLOCKING = 'UNLOCKING',
  UNLOCKED = 'UNLOCKED',
  DECOY_REJECTED = 'DECOY_REJECTED'
}
