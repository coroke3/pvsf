import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter, faInstagram, faYoutube, faDiscord } from "@fortawesome/free-brands-svg-icons";
import { useTheme } from 'next-themes';

// フッターナビゲーションの構造を定義
const footerNavigation = [
  {
    title: "企画",
    items: [
      { label: "PVSF2025Sp", href: "/page/2025sp" },
      { label: "参加する", href: "/page/join" },
      { label: "投稿予定のご案内", href: "/release" }
    ]
  },
  {
    title: "アーカイブ",
    items: [
      { label: "過去の投稿作品", href: "https://archive.pvsf.jp/", external: true },
      { label: "過去企画", href: "https://archive.pvsf.jp/event", external: true }
    ]
  },
  {
    title: "運営情報",
    items: [
      { label: "運営メンバー", href: "/page/management" },
      { label: "Q＆A", href: "/page/qanda" }
    ]
  },
  {
    title: "SNS",
    items: [
      { label: "YouTube", href: "https://www.youtube.com/@PVScreeningFes", external: true },
      { label: "Twitter", href: "https://twitter.com/pvscreeningfes", external: true },
      { label: "Discord", href: "https://discord.gg/QXmb76qB47", external: true }
    ]
  },
  {
    title: "",
    items: [
      { label: "グッズ", href: "https://suzuri.jp/PVScreeningFes", external: true }
    ]
  }
];

// SNSリンクの定義
const socialLinks = [
  { icon: faXTwitter, href: "https://twitter.com/PVScreeningFes" },
  { icon: faInstagram, href: "https://www.instagram.com/pvscreeningfes/" },
  { icon: faYoutube, href: "https://www.youtube.com/channel/UCBvhWOJ3sR3hBjO4xjq3aGQ" },
  { icon: faDiscord, href: "https://discord.gg/QXmb76qB47" }
];

// 外部リンクかどうかを判定する関数
const isExternalLink = (href) => {
  return href.startsWith('http') || href.startsWith('https');
};

function Footer() {
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark"
    ? "https://i.gyazo.com/f736d6fc965df51b682ccc29bc842eaf.png"
    : "https://i.gyazo.com/70f00bd1015f6f121eb099b11ce450c0.png";

  return (
    <footer>
      <div className="menufooters">
        {/* ブランド情報セクション */}
        <div className="mf1">
          <div className="mf1-2">
            <p className="t">PVSF</p>
            <p>みんなで成長しよう</p>
            <div className="menusns">
              {socialLinks.map((link, index) => (
                <>
                  <a
                    key={index}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FontAwesomeIcon icon={link.icon} />
                  </a>
                  {index < socialLinks.length - 1 && "・"}
                </>
              ))}
            </div>
          </div>
        </div>

        {/* ナビゲーションセクション */}
        <div className="menu-footer-container">
          <ul id="menu-footer" className="fmenu">
            {footerNavigation.map((section, index) => (
              <li key={index} className="menu-item menu-item-has-children">
                <a>{section.title}</a>
                <ul className="sub-menu">
                  {section.items.map((item, itemIndex) => {
                    const isExternal = item.external || isExternalLink(item.href);
                    return (
                      <li key={itemIndex} className="menu-item">
                        <a
                          href={item.href}
                          target={isExternal ? "_blank" : undefined}
                          rel={isExternal ? "noopener noreferrer" : undefined}
                        >
                          {item.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
