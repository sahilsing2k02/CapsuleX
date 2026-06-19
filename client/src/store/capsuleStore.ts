import { create } from 'zustand';

export interface Capsule {
  _id: string;
  creator: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
  title: string;
  description?: string;
  type: 'standard' | 'friendship' | 'letter';
  contentType: 'text' | 'media' | 'voice';
  isLocked: boolean;
  unlockCondition: {
    type: 'time' | 'followers' | 'capsules' | 'custom';
    targetDate?: string;
    targetCount?: number;
    description?: string;
    isFulfilled: boolean;
  };
  text?: string;
  mediaUrls?: string[];
  voiceUrl?: string;
  collaborators: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
  }[];
  likes: string[];
  comments: {
    user: string;
    name: string;
    text: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface CapsuleState {
  capsules: Capsule[];
  isLoading: boolean;
  error: string | null;
  fetchCapsules: () => Promise<void>;
  getCapsuleById: (id: string) => Promise<Capsule | null>;
  createCapsule: (capsuleData: Partial<Capsule>) => Promise<Capsule | null>;
  unlockCapsule: (id: string) => Promise<Capsule | null>;
  toggleLike: (id: string) => Promise<void>;
  addComment: (id: string, text: string) => Promise<void>;
}

export const useCapsuleStore = create<CapsuleState>((set) => ({
  capsules: [],
  isLoading: false,
  error: null,

  fetchCapsules: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/capsules');
      if (res.ok) {
        const data = await res.json();
        set({ capsules: data, isLoading: false });
      } else {
        const data = await res.json().catch(() => ({}));
        set({ error: data.message || 'Failed to fetch capsules', isLoading: false });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      set({ error: msg, isLoading: false });
    }
  },

  getCapsuleById: async (id) => {
    try {
      const res = await fetch(`/api/capsules/${id}`);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  },

  createCapsule: async (capsuleData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/capsules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(capsuleData),
      });

      if (res.ok) {
        const newCapsule = await res.json();
        set((state) => ({
          capsules: [newCapsule, ...state.capsules],
          isLoading: false,
        }));
        return newCapsule;
      } else {
        const data = await res.json().catch(() => ({}));
        set({ error: data.message || 'Failed to create capsule', isLoading: false });
        return null;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  unlockCapsule: async (id) => {
    try {
      const res = await fetch(`/api/capsules/${id}/unlock`, {
        method: 'POST',
      });
      if (res.ok) {
        const updatedCapsule = await res.json();
        // Update local state list
        set((state) => ({
          capsules: state.capsules.map((c) => (c._id === id ? updatedCapsule : c)),
        }));
        return updatedCapsule;
      }
      return null;
    } catch {
      return null;
    }
  },

  toggleLike: async (id) => {
    try {
      const res = await fetch(`/api/capsules/${id}/like`, {
        method: 'POST',
      });
      if (res.ok) {
        const { likes } = await res.json();
        set((state) => ({
          capsules: state.capsules.map((c) => (c._id === id ? { ...c, likes } : c)),
        }));
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  },

  addComment: async (id, text) => {
    try {
      const res = await fetch(`/api/capsules/${id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const comments = await res.json();
        set((state) => ({
          capsules: state.capsules.map((c) => (c._id === id ? { ...c, comments } : c)),
        }));
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  },
}));
