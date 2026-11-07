import { User } from '../types';

const STORAGE_KEY = 'dbuy_auth_session_v1';

export const saveSession = (user: User) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user }));
  } catch (e) {
    console.error('Failed to save session to localStorage', e);
  }
};

export const loadSession = (): User | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).user : null;
  } catch (e) {
    console.error('Failed to load session from localStorage', e);
    return null;
  }
};

export const clearSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear session', e);
  }
};
