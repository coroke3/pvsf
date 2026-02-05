// Header component with login functionality
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter, faInstagram, faYoutube, faDiscord } from "@fortawesome/free-brands-svg-icons";
import { faUser, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { Card, CardHeader, CardBody, CardFooter } from "@nextui-org/card";
import { Divider } from "@nextui-org/divider";
import { Input } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import { ThemeSwitcher } from "./ThemeSwitcher";
import Image from "next/image";
import { useRouter } from "next/router";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";

// 外部リンクかどうかを判定する関数
const isExternalLink = (href) => {
  return href.startsWith('http') || href.startsWith('https');
};

const menuItems = [
  { title: "PVSF2025S", subtitle: "企画概要", href: "/page/pvsf2025s" },
  { title: "JOIN", subtitle: "参加する", href: "/page/join" },
  { title: "RELEASES", subtitle: "投稿予定のご案内", href: "/release" },
  { title: "Q&A", subtitle: "質問", href: "/page/qanda" },
  { title: "ARCHIVES", subtitle: "過去の作品(外部サイト)", href: "https://archive.pvsf.jp", external: true },
];

function Header() {
  const router = useRouter();
  const [isHide, setIsHide] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const [imageSrc, setImageSrc] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Auth hook
  const { user, isAuthenticated, isLoading, login, logout, isAdmin } = useAuth();

  useEffect(() => {
    // ルーター準備完了まで待機（本番ビルドでパスが正しく取れるように）
    if (!router.isReady || typeof window === "undefined") return;

    const isHomePage = router.asPath === "/" || router.asPath === "";

    const handleScroll = () => {
      if (!isHomePage) {
        setIsHide(false);
        return;
      }
      // トップページ: 1画面分スクロールで表示/非表示
      if (window.scrollY > window.innerHeight * 0.75) {
        setIsHide(false);
      } else {
        setIsHide(true);
      }
    };

    // 初回状態を設定
    if (isHomePage) {
      handleScroll();
      window.addEventListener("scroll", handleScroll);
    } else {
      setIsHide(false);
    }

    const handleRouteChange = (url) => {
      const isNowHome = url === "/" || url === "";
      if (isNowHome) {
        handleScroll();
      } else {
        setIsHide(false);
      }
    };

    router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.isReady, router.asPath, router.events]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isUserMenuOpen && !event.target.closest('.user-menu-container')) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isUserMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  return (
    <header className={`site-header ${isHide ? "Hide" : ""} ${isMobileMenuOpen ? "mobile-open" : ""}`}>
      <div className="header-content">
        <div className={`logo-area `}>
          <Link href="/">

            <p className="event-type">movie event</p>
            <div className="logo-title">
              <div className="logo">
                <svg id="_レイヤー_3" data-name="レイヤー 3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 796.32 1905.69">
                  <path d="M258.5,1146.44h-77c0-28.81-23.44-52.25-52.25-52.25v-77c71.27,0,129.25,57.98,129.25,129.25Z" />
                  <path d="M129.25,1198.69c-28.81,0-52.25-23.44-52.25-52.25H0C0,1217.71,57.98,1275.69,129.25,1275.69c28.81,0,52.25,23.44,52.25,52.25h77c0-71.27-57.98-129.25-129.25-129.25Z" />
                  <path d="M134.35,1457.18c-71.27,0-129.25-57.98-129.25-129.25H82.1c0,28.81,23.44,52.25,52.25,52.25v77Z" />
                  <polygon points="501.34 920.75 455.49 1017.19 311.68 683.28 402.45 683.28 501.34 920.75" />
                  <circle cx="551.85" cy="733.79" r="50.51" />
                  <rect x="473.43" y="915.85" width="156.84" height="488.75" transform="translate(1712.08 608.38) rotate(90)" />
                  <path d="M307.39,1905.69v-227.62c0-36.65,7.2-72.24,21.39-105.79,13.69-32.37,33.27-61.42,58.2-86.34,24.93-24.93,53.98-44.51,86.34-58.2,33.55-14.19,69.14-21.38,105.79-21.38h217.22v155.57h-217.22c-64.05,0-116.15,52.1-116.15,116.15v227.62h-155.57Z" />
                  <rect y="458.51" width="175.36" height="497.73" />
                  <path d="M311.78,623.55v-166c80.38,0,145.78-65.39,145.78-145.78s-65.39-145.78-145.78-145.78-145.78,65.39-145.78,145.78H0c0-42.05,8.25-82.89,24.53-121.38,15.71-37.14,38.18-70.47,66.78-99.08s61.94-51.07,99.08-66.78C228.88,8.25,269.72,0,311.78,0s82.89,8.25,121.38,24.53c37.14,15.71,70.47,38.18,99.08,66.78,28.61,28.61,51.08,61.94,66.78,99.08,16.28,38.49,24.54,79.33,24.54,121.38s-8.25,82.89-24.54,121.38c-15.71,37.14-38.18,70.47-66.78,99.08-28.61,28.61-61.94,51.07-99.08,66.78-38.49,16.28-79.33,24.53-121.38,24.53Z" />
                </svg>
              </div>
              <div className="title">
                <h1>PVSF</h1>
                <p>映像連続投稿祭</p>
              </div>
            </div>
          </Link>
        </div>

        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          <div className={`hamburger ${isMobileMenuOpen ? "active" : ""}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>

        <nav className={`menu ${isMobileMenuOpen ? "mobile-visible" : ""}`}>
          <ul>
            {menuItems.map((item, index) => {
              const isExternal = item.external || isExternalLink(item.href);
              return (
                <li key={index}>
                  {isExternal ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="menu-title text-split">
                        {[...item.title].map((char, index) => (
                          <span key={index} data-random={index}>{char}</span>
                        ))}
                      </div>
                      <div className="menu-subtitle text-split">
                        {[...item.subtitle].map((char, index) => (
                          <span key={index} data-random={index}>{char}</span>
                        ))}
                      </div>
                    </a>
                  ) : (
                    <Link href={item.href}>
                      <div className="menu-title text-split">
                        {[...item.title].map((char, index) => (
                          <span key={index} data-random={index}>{char}</span>
                        ))}
                      </div>
                      <div className="menu-subtitle text-split">
                        {[...item.subtitle].map((char, index) => (
                          <span key={index} data-random={index}>{char}</span>
                        ))}
                      </div>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Auth Section */}
        <div className="auth-section">
          {isLoading ? (
            <div className="auth-loading">
              <span className="loading-spinner"></span>
            </div>
          ) : isAuthenticated ? (
            <div className="user-menu-container">
              <button className="user-avatar-btn" onClick={toggleUserMenu}>
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.name || 'User'}
                    className="user-avatar"
                  />
                ) : (
                  <div className="user-avatar-placeholder">
                    <FontAwesomeIcon icon={faUser} />
                  </div>
                )}
              </button>
              {isUserMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-info">
                    <span className="user-name">{user?.name}</span>
                    {isAdmin && <span className="admin-badge">Admin</span>}
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link href="/profile" className="dropdown-item">
                    <FontAwesomeIcon icon={faUser} />
                    プロフィール
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className="dropdown-item">
                      <FontAwesomeIcon icon={faUser} />
                      管理画面
                    </Link>
                  )}
                  <button className="dropdown-item logout-btn" onClick={logout}>
                    <FontAwesomeIcon icon={faSignOutAlt} />
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="login-btn" onClick={login}>
              <FontAwesomeIcon icon={faDiscord} />
              <span>ログイン</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
