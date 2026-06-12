import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  onIdTokenChanged,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { queryClient } from "@/lib/queryClient";
import type { User } from "@shared/models/auth";

interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let lastUid: string | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;

    let cancelled = false;
    let activeRequestId = 0;

    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      const requestId = ++activeRequestId;

      setFirebaseUser(fbUser);

      const newUid = fbUser?.uid ?? null;
      if (newUid !== lastUid) {
        lastUid = newUid;
        queryClient.clear();
      }

      if (fbUser && fbUser.emailVerified) {
        try {
          const token = await fbUser.getIdToken(true);
          if (cancelled || requestId !== activeRequestId) return;

          const res = await fetch("/api/auth/user", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (cancelled || requestId !== activeRequestId) return;

          if (res.ok) {
            const userData = await res.json();
            setUser(userData);

            const stored = localStorage.getItem("newsletter_opt_in");
            if (stored !== null) {
              localStorage.removeItem("newsletter_opt_in");
              let optIn: unknown = null;
              try {
                optIn = JSON.parse(stored);
              } catch {
                // Ungültiger Wert – Einwilligung im Zweifel nicht annehmen.
              }
              // Den tatsächlich gewählten Wert übertragen: Neuanlagen starten
              // serverseitig ohne Opt-In, eine angekreuzte Checkbox muss also
              // explizit als true gesynct werden (und false bleibt false).
              if (optIn === true || optIn === false) {
                fetch("/api/user/profile", {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ newsletterOptIn: optIn }),
                }).then((r) => {
                  if (r.ok) r.json().then((u) => setUser(u));
                }).catch(() => {});
              }
            }
          } else {
            setUser(null);
          }
        } catch {
          if (!cancelled && requestId === activeRequestId) {
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }

      if (!cancelled && requestId === activeRequestId) {
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    if (!auth) return;
    lastUid = null;
    queryClient.clear();
    await signOut(auth);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isAuthenticated: !!user,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const SSR_FALLBACK: AuthContextValue = {
  user: null,
  firebaseUser: null,
  isLoading: true,
  isAuthenticated: false,
  logout: async () => {},
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    if (typeof window === "undefined") return SSR_FALLBACK;
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
