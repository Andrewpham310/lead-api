import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getMe,
  login as loginApi,
  logoutAllSessions,
  register as registerApi,
} from '../api/auth';

const AuthContext = createContext(null);

const TOKEN_KEY = 'nw_token';
const USER_KEY = 'nw_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    getMe(token)
      .then((profile) => {
        const userData = {
          id: profile.id || profile._id,
          name: profile.name,
          email: profile.email,
          authProvider: profile.authProvider,
          hasPassword: profile.hasPassword,
        };
        setUser(userData);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
      })
      .catch(() => {
        logout();
      })
      .finally(() => setLoading(false));
  }, [logout, token]);

  const saveSession = useCallback((newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }, []);

  const login = async (email, password) => {
    const data = await loginApi({ email, password });
    saveSession(data.token, data.user);
    return data;
  };

  // Revokes every session on the server (all devices), then clears this one.
  const logoutAll = useCallback(async () => {
    if (token) {
      try {
        await logoutAllSessions(token);
      } catch (err) {
        // 401 means this token was already revoked; anything else is a real failure.
        if (err.status !== 401) throw err;
      }
    }

    logout();
  }, [logout, token]);

  const register = async (name, email, password) => {
    const data = await registerApi({ name, email, password });
    saveSession(data.token, data.user);
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        logoutAll,
        saveSession,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
