import { useState } from "react"; // Add this line to import useState hook
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter } from "@fortawesome/free-brands-svg-icons";
import { faInstagram } from "@fortawesome/free-brands-svg-icons";
import { faYoutube } from "@fortawesome/free-brands-svg-icons";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import Link from "next/link";

function Header() {
  // Step 2: Add a state variable to track the menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Step 3: Create a function to toggle the menu state
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header>
      {/* ... Existing header content ... */}
      {/* Step 4: Conditionally render the menu items */}
      <div className={`hamburger-menu ${isMenuOpen ? "open" : ""}`}>
        <div className="menu-btn" onClick={toggleMenu}>
          <div className="menu-btn__burger"></div>
          <div className="menu-btn__burger"></div>
          <div className="menu-btn__burger"></div>
        </div>
        <div className="menu-items">
          <div className="hea">
            <Link href="../../../../">
              <img src="https://i.gyazo.com/70f00bd1015f6f121eb099b11ce450c0.png" className="b" />
              <img src="https://i.gyazo.com/f736d6fc965df51b682ccc29bc842eaf.png"className="w" />
            </Link>

            <Link href="../../../../">
              <h1 className="sitetitle2">- movie event</h1>
              <h1 className="sitetitle">PVSF</h1>
            </Link>

            <div className="menusns">
              <a
                href="https://twitter.com/PVScreeningFes"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon icon={faTwitter} />
              </a>
              ・
              <a
                href="https://www.instagram.com/pvscreeningfes/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon icon={faInstagram} />
              </a>
              ・
              <a
                href="https://www.youtube.com/channel/UCBvhWOJ3sR3hBjO4xjq3aGQ"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon icon={faYoutube} />
              </a>
              ・
              <a
                href="https://discord.gg/QXmb76qB47"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon icon={faDiscord} />
              </a>
            </div>
          </div>
          <div className="menubar">
            <div className="menubars ms2">
              <Link href="../../../../page/5s_i_h_ir">PVSF2023S</Link>
            </div>
            <div className="menubars ms1">
              <Link href="../../../../page/hv8gfp0jdji">参加する</Link>
            </div>
            <div className="menubars ms1">
              <Link href="../../../../release ">
                投稿予定のご案内
              </Link>
            </div>
            <div className="menubars ms1">
              <Link href="../../../../work">過去の投稿作品</Link>
            </div>
            <div className="menubars ms1">
              <Link href="../../../../page/25ta926vp">Q＆A</Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
