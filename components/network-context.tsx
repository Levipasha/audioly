import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

type NetworkContextType = {
  isConnected: boolean;
  isInternetReachable: boolean;
};

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [networkState, setNetworkState] = useState<NetInfoState | null>(null);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkState(state);
    });

    // Get initial network state
    void NetInfo.fetch().then(setNetworkState);

    return () => {
      unsubscribe();
    };
  }, []);

  const isConnected = networkState?.isConnected ?? true;
  const isInternetReachable = networkState?.isInternetReachable ?? true;

  return (
    <NetworkContext.Provider value={{ isConnected, isInternetReachable }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return ctx;
}
