import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

export default function useAdminCheck() {
    const { user, isLoading, isAuthenticated, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push('/');
            } else if (!isAdmin) {
                router.push('/');
            }
        }
    }, [isLoading, isAuthenticated, isAdmin, router]);

    return { isLoading, isAdmin };
}
