import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { faInstagram } from "@fortawesome/free-brands-svg-icons";
import { faYoutube } from "@fortawesome/free-brands-svg-icons";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import Image from 'next/image'
import { useTheme } from 'next-themes'
function Footer() {
  const { resolvedTheme } = useTheme()
  let src

  switch (resolvedTheme) {
    case "light":
      src = "https://i.gyazo.com/70f00bd1015f6f121eb099b11ce450c0.png";
      break;
    case "dark":
      src = "https://i.gyazo.com/f736d6fc965df51b682ccc29bc842eaf.png";
      break;
    default:
      src = "https://i.gyazo.com/70f00bd1015f6f121eb099b11ce450c0.png";
      break;
  }

  return (
    <footer>
      <div className="menufooters">
        <div class="mf1">
 
          <div class="mf1-2">
            <p class="t">PVSF</p>
            <p>みんなで成長しよう</p>
            <div className="menusns">
              <a
                href="https://twitter.com/PVScreeningFes"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon icon={faXTwitter} />
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
        </div>
        <div class="menu-footer-container">
          <ul id="menu-footer" class="fmenu">
            <li
              id="menu-item-453"
              class="menu-item menu-item-type-custom menu-item-object-custom current-menu-ancestor current-menu-parent menu-item-has-children menu-item-453"
            >
              <a id="generated-id-1690357356137-52cy6kfnc">前回企画</a>
              <ul class="sub-menu">
                <li
                  id="menu-item-452"
                  class="menu-item menu-item-type-post_type menu-item-object-page current-menu-item page_item page-item-403 current_page_item menu-item-452"
                >
                  <a
                    href="../../../../page/x_oezj2-_j2"
                    aria-current="page"
                    id="generated-id-1690357356137-ug4l8muy2"
                  >
                    PVSF2023R
                  </a>
                </li>
                <li
                  id="menu-item-455"
                  class="menu-item menu-item-type-post_type menu-item-object-page menu-item-455"
                >
                  <a
                    href="../../../../page/g6j4xiibusht"
                    id="generated-id-1690357356137-lnb7f578m"
                  >
                    参加する
                  </a>
                </li>
                <li
                  id="menu-item-455"
                  class="menu-item menu-item-type-post_type menu-item-object-page menu-item-455"
                >
                  <a
                    href="../../../../release"
                    id="generated-id-1690357356137-lnb7f578m"
                  >
                    投稿予定のご案内
                  </a>
                </li>
              
              </ul>
            </li>
            <li
              id="menu-item-444"
              class="menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-444"
            >
              <a id="generated-id-1690357356137-pzn39eubj">アーカイブ</a>
              <ul class="sub-menu">
                <li
                  id="menu-item-446"
                  class="menu-item menu-item-type-post_type menu-item-object-page menu-item-446"
                >
                  <a
                    href="../../../../work"
                    id="generated-id-1690357356137-m8jseak9s"
                  >
                    過去の投稿作品
                  </a>
                </li>
                <li
                  id="menu-item-295"
                  class="menu-item menu-item-type-post_type menu-item-object-page menu-item-295"
                >
                  <a
                    href="../../../../page/typk4cig9"
                    id="generated-id-1690357356137-fjm69h0y5"
                  >
                    過去企画
                  </a>
                </li>
              </ul>
            </li>
            <li
              id="menu-item-172"
              class="menu-item menu-item-type-taxonomy menu-item-object-category menu-item-has-children menu-item-172"
            >
              <a id="generated-id-1690357356137-y0yhmde4e">運営情報</a>
              <ul class="sub-menu">
                <li
                  id="menu-item-171"
                  class="menu-item menu-item-type-post_type menu-item-object-page menu-item-171"
                >
                  <a
                    href="../../../../page/lwu97rrl9d2f/"
                    id="generated-id-1690357356137-ickgpyf78"
                  >
                    運営メンバー
                  </a>
                </li>
                <li
                  id="menu-item-457"
                  class="menu-item menu-item-type-post_type menu-item-object-page menu-item-457"
                >
                  <a
                    href="../../../../page/25ta926vp"
                    id="generated-id-1690357356137-cfqchvs5w"
                  >
                    Q＆A
                  </a>
                </li>
              </ul>
            </li>
            <li
              id="menu-item-458"
              class="menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-458"
            >
              <a id="generated-id-1690357356137-wt6i7ecb4">SNS</a>
              <ul class="sub-menu">
                <li
                  id="menu-item-459"
                  class="menu-item menu-item-type-custom menu-item-object-custom menu-item-459"
                >
                  <a
                    href="https://www.youtube.com/@PVScreeningFes"
                    id="generated-id-1690357356137-u6dwa5w9o"
                  >
                    YouTube
                  </a>
                </li>
                <li
                  id="menu-item-460"
                  class="menu-item menu-item-type-custom menu-item-object-custom menu-item-460"
                >
                  <a
                    href="https://twitter.com/pvscreeningfes"
                    id="generated-id-1690357356137-qzgj3y2f9"
                  >
                    Twitter
                  </a>
                </li>
                <li
                  id="menu-item-461"
                  class="menu-item menu-item-type-custom menu-item-object-custom menu-item-461"
                >
                  <a
                    href="https://discord.gg/QXmb76qB47"
                    id="generated-id-1690357356137-gqj9d6rhx"
                  >
                    Discord
                  </a>
                </li>
              </ul>
            </li>
            <li
              id="menu-item-462"
              class="menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-462"
            >
              <a></a>
              <ul class="sub-menu">
                <li
                  id="menu-item-260"
                  class="menu-item menu-item-type-custom menu-item-object-custom menu-item-260"
                >
                  <a
                    href="https://suzuri.jp/PVScreeningFes"
                    id="generated-id-1690357356137-4pj16qw14"
                  >
                    グッズ
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
