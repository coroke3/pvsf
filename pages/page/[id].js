// pages/blog/[id].js
import Link from "next/link";
import { client } from "../../libs/client";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { faInstagram } from "@fortawesome/free-brands-svg-icons";
import { faYoutube } from "@fortawesome/free-brands-svg-icons";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "microcms-js-sdk";
import Head from "next/head";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function PageId({ page }) {
  return (
    <div>
      <Head>
        <title>{page.title} - オンライン映像イベント / PVSF</title>
        <meta name="description" content={``} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@pvscreeningfes" />
        <meta name="twitter:creator" content="@coroke3" />
        <meta property="og:url" content="pvsf.jp" />
        <meta property="og:title" content={`${page.title} - オンライン映像イベント / PVSF`} />
        <meta property="og:description" content="" />
        <meta
          property="og:image"
          content="https://i.gyazo.com/35170e03ec321fb94276ca1c918efabc.jpg"
        />
      </Head>
      <Header />
      <div className="content">
        <h2>{page.title}</h2>

        {/* カスタムコンテンツの表示 */}
        {page.customcontent && page.customcontent.map((content, index) => {
          switch (content.fieldId) {
            case "rich":
              return (
                <div
                  key={index}
                  dangerouslySetInnerHTML={{ __html: content.rich }}
                />
              );

            case "eventmanage":
              return (
                <div key={index} className="event-manage">
                  <h3>{content.eventname}</h3>
                  {content.manager.map((manager, mIndex) => (
                    <div key={mIndex} className="manager">
                      {manager.icon && (
                        <img src={manager.icon} alt={manager.name} />
                      )}
                      <div className="manager-info">
                        <h4>{manager.name}</h4>
                        {manager.janame && <p className="ja-name">{manager.janame}</p>}
                        <div className="manager-types">
                        {manager.entype && manager.entype.map((type, tIndex) => (
                            <span key={tIndex} className="type-badge">{type}</span>
                          ))}
                          {manager.jatype && manager.jatype.map((type, tIndex) => (
                            <span key={tIndex} className="type-badge">{type}</span>
                          ))}
                        </div>
                        {manager.link && (
                          <div className="social-links">
                            {manager.link.map((link, lIndex) => {
                              const icon = {
                                faXTwitter,
                                faInstagram,
                                faYoutube,
                                faDiscord,
                                faGlobe
                              }[link.iconid[0]];
                              return (
                                <a key={lIndex} href={link.iconlink} target="_blank" rel="noopener noreferrer">
                                  <FontAwesomeIcon icon={icon} />
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );

            case "top":
              return (
                <div key={index} className="top-content">
                  <h3>{content.title}</h3>
                  {content.image && content.image.map((img, imgIndex) => (
                    <img 
                      key={imgIndex}
                      src={`${img.url}?w=1000&q=40`}
                      alt={content.title}
                      style={{ maxWidth: "100%", height: "auto" }}
                    />
                  ))}
                </div>
              );

            default:
              // その他のフィールドタイプの場合はJSON形式で表示
              return (
                <div key={index} className="debug-content">
                  <pre>{JSON.stringify(content, null, 2)}</pre>
                </div>
              );
          }
        })}

        {/* 従来のpublishedコンテンツの表示 */}
        {page.published && page.published.map((published, index) => (
          <div key={index}>
            {published.rich && (
              <div dangerouslySetInnerHTML={{ __html: published.rich }} />
            )}
            {published.html && (
              <div dangerouslySetInnerHTML={{ __html: published.html }} />
            )}
            {/* その他のフィールドがある場合はJSON形式で表示 */}
            {Object.keys(published).length > 0 && 
             !published.rich && 
             !published.html && (
              <pre>{JSON.stringify(published, null, 2)}</pre>
            )}
          </div>
        ))}

        <Footer />
      </div>
    </div>
  );
}

// 静的生成のためのパスを指定します
export const getStaticPaths = async () => {
  const data = await client.get({ endpoint: "page" });
  
  // IDとpathの両方でアクセスできるようにパスを生成
  const paths = data.contents.flatMap(content => {
    const paths = [`/page/${content.id}`];
    if (content.path) {
      paths.push(`/page/${content.path}`);
    }
    return paths;
  });

  return { paths, fallback: false };
};

// データをテンプレートに受け渡す部分の処理を記述します
export const getStaticProps = async (context) => {
  const idOrPath = context.params.id;
  
  // まずIDで検索
  try {
    const data = await client.get({ endpoint: "page", contentId: idOrPath });
    return {
      props: {
        page: data,
      },
    };
  } catch {
    // IDでの検索に失敗した場合、pathで検索
    const allData = await client.get({ endpoint: "page" });
    const pageData = allData.contents.find(content => content.path === idOrPath);
    
    if (pageData) {
      return {
        props: {
          page: pageData,
        },
      };
    }
    
    // 該当するページが見つからない場合は404
    return {
      notFound: true,
    };
  }
};
