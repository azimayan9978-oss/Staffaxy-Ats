import { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, User } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logoutContext: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  logoutContext: () => {},
  refreshUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading: isUserLoading, refetch } = useGetMe({
    query: { retry: false } as any,
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isUserLoading) {
      setIsLoading(false);
    }
  }, [isUserLoading]);

  const logoutContext = () => {
    refetch();
  };

  const refreshUser = () => { refetch(); };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, logoutContext, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
