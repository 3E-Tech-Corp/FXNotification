import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Application } from '@/types';

interface AppContextType {
  selectedApp: Application | null;
  setSelectedApp: (app: Application | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  return (
    <AppContext.Provider value={{ selectedApp, setSelectedApp }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
