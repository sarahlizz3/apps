import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, AUTHORIZED_UID as _AUTHORIZED_UID } from './firebase';
void _AUTHORIZED_UID;
import { handleRedirectResult } from './auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authorized: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, authorized: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    handleRedirectResult().catch(() => {});
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // TODO: re-enable UID check after discovering AppGrove UID
  // const authorized = user != null && user.uid === AUTHORIZED_UID;
  const authorized = user != null;
  if (user) console.log('AppGrove UID:', user.uid);

  return (
    <AuthContext.Provider value={{ user, loading, authorized }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
