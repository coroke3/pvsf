// components/Layout.tsx
import Header from "./Header";

const Layout = ({ children }: { children: React.ReactNode }) => (
    <>
        <Header />
        <main>{children}</main>
    </>
);

export default Layout;