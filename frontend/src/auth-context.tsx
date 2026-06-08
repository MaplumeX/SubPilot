import {
  createContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { getMe } from "@/api/auth";
import type { UserResponse } from "@/api/types";

interface AuthContextValue {
  user: UserResponse | null;
  loading: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export type { AuthContextValue };
export { AuthContext };

export function AuthProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then((u) => {
        setUser(u);
        i18n.changeLanguage(u.locale || "en");
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [i18n]);

  const setTokens = useCallback(
    (accessToken: string, refreshToken: string) => {
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      getMe().then((u) => {
        setUser(u);
        i18n.changeLanguage(u.locale || "en");
      }).catch(logout);
    },
    [logout, i18n]
  );

  return (
    <AuthContext.Provider value={{ user, loading, setTokens, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
