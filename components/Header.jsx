import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { faInstagram } from "@fortawesome/free-brands-svg-icons";
import { faYoutube } from "@fortawesome/free-brands-svg-icons";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import Link from "next/link";
import { Card, CardHeader, CardBody, CardFooter } from "@nextui-org/card";
import { Divider } from "@nextui-org/divider";
import { Input } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import { ThemeSwitcher } from "./ThemeSwitcher";
import Image from "next/image";
import { useRouter } from "next/router";
import { useTheme } from "next-themes";

const menuItems = [
  { title: "PVSF2025Sp", subtitle: "企画概要", href: "../../page/du2txgs-yyt" },
  { title: "JOIN", subtitle: "参加する", href: "../../page/4el3kd3o8etu" },
  { title: "RELEASES", subtitle: "投稿予定のご案内", href: "../../release" },
  { title: "STUFF", subtitle: "運営スタッフ", href: "../../page/lwu97rrl9d2f" },
  { title: "Q&A", subtitle: "質問", href: "../../page/25ta926vp" },
  { title: "ARCHIVES", subtitle: "過去の作品(外部サイト)", href: "" },
];

function Header() {
  const router = useRouter();
  const [isHide, setIsHide] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const [imageSrc, setImageSrc] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      // パスに応じて異なるスクロール動作を設定
      switch (router.pathname) {
        case "/":
          // トップページ: 1画面分スクロールで表示/非表示
          if (window.scrollY > (window.innerHeight * 0.75)) {
            setIsHide(false);
          } else {
            setIsHide(true);
          }
          break;


        default:
          // その他のページ: 常に表示
          setIsHide(false);
          break;
      }
    };

    const handleRouteChange = (url) => {
      console.log("現在のパス:", url); // URLをログに出力
    };

    // スクロールイベントを監視するパスを指定
    const shouldWatchScroll = ["/"].includes(router.pathname);
    if (shouldWatchScroll) {
      window.addEventListener('scroll', handleScroll);
    } else {
      // その他のページでは常に表示
      setIsHide(false);
    }

    // ルート変更イベントを監視
    router.events.on('routeChangeComplete', handleRouteChange);

    // 初回レンダリング時に現在のパスをログに出力
    console.log("初期パス:", router.pathname);
    switch (router.pathname) {
      case "/":
        // トップページ: 1画面分スクロールで表示/非表示
        if (window.scrollY > window.innerHeight) {
          setIsHide(false);
        } else {
          setIsHide(true);
        }
        break;


      default:
        // その他のページ: 常に表示
        setIsHide(false);
        break;
    }

    // クリーンアップ
    return () => {
      window.removeEventListener('scroll', handleScroll);
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.pathname, router.events]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className={`site-header ${isHide ? "Hide" : ""}`}>
      <div className="header-content">
        <div className={`logo-area `}>
          <a href={"../../../"}>

            <p className="event-type">movie event</p>
            <div className="logo-title">
              <div className="logo">
                <svg
                  viewBox="0 0 803.48 1905.69"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g>
                    <rect
                      x="7.16"
                      y="458.51"
                      width="175.36"
                      height="497.73"
                    ></rect>
                    <path
                      className="cls-1"
                      d="m83,311.78c0-126.35,102.43-228.78,228.78-228.78s228.78,102.43,228.78,228.78-102.43,228.78-228.78,228.78"
                    ></path>
                  </g>
                  <g>
                    <rect
                      x="480.6"
                      y="915.85"
                      width="156.84"
                      height="488.75"
                      transform="translate(1719.25 601.21) rotate(90)"
                    ></rect>
                    <path d="m314.55,1905.69v-227.62c0-36.65,7.2-72.24,21.39-105.79,13.69-32.37,33.27-61.42,58.2-86.34,24.93-24.93,53.98-44.51,86.34-58.2,33.55-14.19,69.14-21.38,105.79-21.38h217.22v155.57h-217.22c-64.05,0-116.15,52.1-116.15,116.15v227.62h-155.57Z"></path>
                  </g>
                  <g>
                    <polygon points="508.5 920.75 462.65 1017.19 318.84 683.28 409.61 683.28 508.5 920.75"></polygon>
                    <circle cx="559.02" cy="733.79" r="50.51"></circle>
                  </g>
                  <g>
                    <path d="m265.66,1146.44h-77c0-28.81-23.44-52.25-52.25-52.25v-77c71.27,0,129.25,57.98,129.25,129.25Z"></path>
                    <path d="m136.41,1198.69c-28.81,0-52.25-23.44-52.25-52.25H7.16c0,71.27,57.98,129.25,129.25,129.25,28.81,0,52.25,23.44,52.25,52.25h77c0-71.27-57.98-129.25-129.25-129.25Z"></path>
                    <path d="m141.51,1457.18c-71.27,0-129.25-57.98-129.25-129.25h77c0,28.81,23.44,52.25,52.25,52.25v77Z"></path>
                  </g>
                </svg>
              </div>
              <div className="title">
                <h1>PVSF</h1>
                <p>映像連続投稿祭</p>
              </div>
            </div>
          </a>
        </div>

        <nav className={`menu `}>
          <ul>
            {menuItems.map((item, index) => (
              <li key={index}>
                <a href={item.href}>
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
              </li>
            ))}
          </ul>
        </nav>

        <div className="menu-btn" onClick={toggleMenu}>
          <div className="menu-btn__burger"></div>
          <div className="menu-btn__burger"></div>
          <div className="menu-btn__burger"></div>
        </div>
      </div>
    </header>
  );
}

export default Header;

