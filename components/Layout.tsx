// components/Layout.tsx
import { ReactNode } from 'react';
import Header from './Header';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    return (
        <>
            <Header />
            <main>
                {children}
            </main>
        </>
    );
}