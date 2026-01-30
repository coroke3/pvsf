// Authentication context provider
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import type { SessionUser, XidClaim, UserRole } from '@/types/user';

interface AuthContextType {
    user: SessionUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    approvedXids: string[];
    refreshUser: () => Promise<void>;
    login: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const isLoading = status === 'loading';
    const isAuthenticated = !!session?.user;

    const [dbUser, setDbUser] = useState<SessionUser | null>(null);

    // Initial user from session (fast fallback)
    const sessionUser: SessionUser | null = session?.user
        ? {
            id: (session.user as any).discordId || session.user.email || '',
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
            discordId: (session.user as any).discordId,
            role: (session.user as any).role as UserRole,
            xidClaims: (session.user as any).xidClaims as XidClaim[],
        }
        : null;

    // Use dbUser if available (fresher), otherwise sessionUser
    const user = dbUser ? { ...sessionUser, ...dbUser } : sessionUser;

    const refreshUser = async () => {
        if (!session?.user) return;
        try {
            const res = await fetch('/api/user/me');
            if (res.ok) {
                const data = await res.json();
                setDbUser({
                    ...sessionUser, // Keep session info like name/image as base
                    ...data, // Overwrite with fresh DB data (role, xidClaims)
                    // Ensure image is what we want (DB might have old avatar if not updated on login, but session has fresh from Discord)
                    // Actually session has fresh avatar from login. DB has stored avatar. 
                    // Let's trust session for profile info (name/image) and DB for data (role/claims).
                    // But Wait, data return from /api/user/me includes discordAvatar.
                    // If we want fresh status, we mainly care about xidClaims and role.
                    role: data.role,
                    xidClaims: data.xidClaims,
                    // If we stored avatar in DB, let's use it or fallback to session
                    image: data.discordAvatar || sessionUser?.image,
                } as SessionUser);
            }
        } catch (error) {
            console.error('Failed to refresh user data', error);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            refreshUser();
        }
    }, [isAuthenticated]);

    const isAdmin = user?.role === 'admin';

    const approvedXids = user?.xidClaims
        ?.filter((claim: XidClaim) => claim.status === 'approved')
        .map((claim: XidClaim) => claim.xid) || [];

    const login = async () => {
        await signIn('discord');
    };

    const logout = async () => {
        await signOut({ callbackUrl: '/' });
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated,
                isAdmin,
                approvedXids,
                refreshUser,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
