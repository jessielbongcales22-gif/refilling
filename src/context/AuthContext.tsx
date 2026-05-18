import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "staff" | "customer";
  phone?: string;
  address?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("water_market_user");
    const savedToken = localStorage.getItem("water_market_token");

    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        localStorage.removeItem("water_market_user");
        localStorage.removeItem("water_market_token");
        localStorage.removeItem("isLoggedIn");
      }
    }
  }, []);

  const login = (userData: User, authToken: string) => {
    localStorage.setItem("water_market_user", JSON.stringify(userData));
    localStorage.setItem("water_market_token", authToken);
    localStorage.setItem("isLoggedIn", "true");

    setUser(userData);
    setToken(authToken);
  };

  const logout = () => {
    localStorage.removeItem("water_market_user");
    localStorage.removeItem("water_market_token");
    localStorage.removeItem("isLoggedIn");

    setUser(null);
    setToken(null);
  };

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";
  const isCustomer = user?.role === "customer";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isStaff,
        isCustomer,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
