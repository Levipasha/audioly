import React, { createContext, useContext, useState, useEffect, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RepeatMode = 'none' | 'one' | 'all';

export type QueueSong = {
  id: string;
  title: string;
  subtitle?: string;
  audioUrl: string;
  coverUrl?: string;
  category?: string;
  playCount?: number;
  owner?: {
    name: string;
  };
};

type QueueContextType = {
  queue: QueueSong[];
  setQueue: Dispatch<SetStateAction<QueueSong[]>>;
  currentIndex: number;
  setCurrentIndex: Dispatch<SetStateAction<number>>;
  shuffle: boolean;
  setShuffle: Dispatch<SetStateAction<boolean>>;
  repeatMode: RepeatMode;
  setRepeatMode: Dispatch<SetStateAction<RepeatMode>>;
  addToQueue: (song: QueueSong) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  getNextIndex: () => number | null;
  getPrevIndex: () => number | null;
  shuffledOrder: number[];
  setShuffledOrder: Dispatch<SetStateAction<number[]>>;
};

const QueueContext = createContext<QueueContextType | undefined>(undefined);

const QUEUE_STORAGE_KEY = 'audioly_queue';
const SHUFFLE_STORAGE_KEY = 'audioly_shuffle';
const REPEAT_STORAGE_KEY = 'audioly_repeat';

export function QueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [shuffledOrder, setShuffledOrder] = useState<number[]>([]);

  // Load queue from storage on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [queueData, shuffleData, repeatData] = await Promise.all([
          AsyncStorage.getItem(QUEUE_STORAGE_KEY),
          AsyncStorage.getItem(SHUFFLE_STORAGE_KEY),
          AsyncStorage.getItem(REPEAT_STORAGE_KEY),
        ]);

        if (queueData) {
          const parsed = JSON.parse(queueData);
          setQueue(parsed);
        }

        if (shuffleData === 'true') {
          setShuffle(true);
        }

        if (repeatData && ['none', 'one', 'all'].includes(repeatData)) {
          setRepeatMode(repeatData as RepeatMode);
        }
      } catch {
        // ignore
      }
    };
    void load();
  }, []);

  // Save queue to storage when it changes
  useEffect(() => {
    void AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  }, [queue]);

  // Save shuffle state
  useEffect(() => {
    void AsyncStorage.setItem(SHUFFLE_STORAGE_KEY, shuffle ? 'true' : 'false');
  }, [shuffle]);

  // Save repeat mode
  useEffect(() => {
    void AsyncStorage.setItem(REPEAT_STORAGE_KEY, repeatMode);
  }, [repeatMode]);

  // Generate shuffled order when shuffle is enabled
  useEffect(() => {
    if (shuffle && queue.length > 0) {
      const order = queue.map((_, i) => i);
      // Fisher-Yates shuffle
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      // Ensure current song stays at the beginning if it was already playing
      if (currentIndex >= 0 && currentIndex < order.length) {
        const currentPos = order.indexOf(currentIndex);
        if (currentPos > 0) {
          [order[0], order[currentPos]] = [order[currentPos], order[0]];
        }
      }
      setShuffledOrder(order);
    } else {
      setShuffledOrder([]);
    }
  }, [shuffle, queue.length, currentIndex]);

  const addToQueue = (song: QueueSong) => {
    setQueue((prev) => [...prev, song]);
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (currentIndex > index && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (currentIndex >= next.length) {
        setCurrentIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  const reorderQueue = (fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);

      // Adjust current index if needed
      if (currentIndex === fromIndex) {
        setCurrentIndex(toIndex);
      } else if (currentIndex === toIndex) {
        setCurrentIndex(fromIndex);
      } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
        setCurrentIndex(currentIndex - 1);
      } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
        setCurrentIndex(currentIndex + 1);
      }

      return next;
    });
  };

  const getNextIndex = (): number | null => {
    if (queue.length === 0) return null;

    if (repeatMode === 'one') {
      return currentIndex;
    }

    if (shuffle && shuffledOrder.length > 0) {
      const currentInShuffle = shuffledOrder.indexOf(currentIndex);
      if (currentInShuffle >= 0 && currentInShuffle < shuffledOrder.length - 1) {
        return shuffledOrder[currentInShuffle + 1];
      } else if (repeatMode === 'all') {
        return shuffledOrder[0];
      }
      return null;
    }

    if (currentIndex < queue.length - 1) {
      return currentIndex + 1;
    } else if (repeatMode === 'all') {
      return 0;
    }
    return null;
  };

  const getPrevIndex = (): number | null => {
    if (queue.length === 0) return null;

    if (shuffle && shuffledOrder.length > 0) {
      const currentInShuffle = shuffledOrder.indexOf(currentIndex);
      if (currentInShuffle > 0) {
        return shuffledOrder[currentInShuffle - 1];
      } else if (repeatMode === 'all') {
        return shuffledOrder[shuffledOrder.length - 1];
      }
      return null;
    }

    if (currentIndex > 0) {
      return currentIndex - 1;
    } else if (repeatMode === 'all') {
      return queue.length - 1;
    }
    return null;
  };

  return (
    <QueueContext.Provider
      value={{
        queue,
        setQueue,
        currentIndex,
        setCurrentIndex,
        shuffle,
        setShuffle,
        repeatMode,
        setRepeatMode,
        addToQueue,
        removeFromQueue,
        reorderQueue,
        getNextIndex,
        getPrevIndex,
        shuffledOrder,
        setShuffledOrder,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  const ctx = useContext(QueueContext);
  if (!ctx) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return ctx;
}
