// components/Layout.tsx
import { ReactNode } from 'react';
import Header from './Header';
import { useRouter } from 'next/router';
import WorksSidebar from './WorksSidebar';

interface Work {
    id: string;
    timestamp: string;
    creator: string;
    title: string;
    icon?: string;
}

interface LayoutProps {
    children: ReactNode;
    works?: Work[];
}

export default function Layout({ children, works }: LayoutProps) {
    const router = useRouter();
    const isReleasePage = router.pathname === '/release/[id]';

    return (
        <>
            <Header />
            <main>
                {children}
            </main>
            {isReleasePage && <WorksSidebar works={works} currentId={router.query.id?.toString()} />}
        </>
    );
}