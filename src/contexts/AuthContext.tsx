import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { apiService } from '../services/api';

interface AuthContextType {
    user: User | null;
    login: (credentials: { username: string; password: string }) => Promise<{ mfaRequired: boolean; tempToken?: string }>;
    verifyMfa: (tempToken: string, code: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('onboarding_user');
        if (saved) {
            try {
                return JSON.parse(saved).user;
            } catch (e) {
                return null;
            }
        }
        return null;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = async (credentials: { username: string; password: string }) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiService.login(credentials);
            
            if (data.mfaRequired) {
                setIsLoading(false);
                return { mfaRequired: true, tempToken: data.tempToken };
            }

            setUser(data.user);
            localStorage.setItem('onboarding_user', JSON.stringify({
                token: data.token,
                user: data.user
            }));
            setIsLoading(false);
            return { mfaRequired: false };
        } catch (err: any) {
            setIsLoading(false);
            const msg = err.response?.data?.error || 'فصل تفويض الدخول - يرجى المحاولة مرة أخرى';
            setError(msg);
            throw new Error(msg);
        }
    };

    const verifyMfa = async (tempToken: string, code: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiService.verifyMfa(tempToken, code);
            setUser(data.user);
            localStorage.setItem('onboarding_user', JSON.stringify({
                token: data.token,
                user: data.user
            }));
            setIsLoading(false);
        } catch (err: any) {
            setIsLoading(false);
            const msg = err.response?.data?.error || 'كود التحقق غير صحيح';
            setError(msg);
            throw new Error(msg);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('onboarding_user');
    };

    // Verify token on mount/refresh
    useEffect(() => {
        const checkAuth = async () => {
            const saved = localStorage.getItem('onboarding_user');
            if (saved) {
                try {
                    const userData = await apiService.getMe();
                    setUser(userData);
                } catch (e) {
                    logout();
                }
            }
        };
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, verifyMfa, logout, isLoading, error }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
