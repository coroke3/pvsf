// pages/blog/[id].js
import Link from "next/link";
import { client } from "../../libs/client";
import Footer from "../../components/Footer";
import { faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { faInstagram } from "@fortawesome/free-brands-svg-icons";
import { faYoutube } from "@fortawesome/free-brands-svg-icons";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "microcms-js-sdk";
import Head from "next/head";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState, useRef, useEffect } from 'react';
import { faChevronLeft, faChevronRight, faTimes } from "@fortawesome/free-solid-svg-icons";

export default function PageId({ page }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [totalWidth, setTotalWidth] = useState(0);

  // top-contentの存在チェック
  const hasTopContent = page.customcontent?.some(content => content.fieldId === "top");

  // ドラッグスクロール処理
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    
    const currentTransform = scrollContainerRef.current.style.transform || 'translateX(60px)';
    const currentX = parseInt(currentTransform.match(/-?\d+/) || 60);
    const newX = scrollLeft - walk;
    
    // スクロール範囲を制限
    const maxScroll = -(scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth - 60);
    const limitedX = Math.max(Math.min(60, newX), maxScroll);
    
    scrollContainerRef.current.style.transform = `translateX(${limitedX}px)`;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // スクロールボタン処理
  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const images = container.querySelectorAll('img');
    const currentTransform = container.style.transform || 'translateX(60px)';
    const currentX = parseInt(currentTransform.match(/-?\d+/) || 60);
    
    // 現在の位置から最も近い画像のインデックスを見つける
    let currentIndex = 0;
    let minDistance = Infinity;
    images.forEach((img, index) => {
      const imgLeft = img.offsetLeft;
      const distance = Math.abs(imgLeft + currentX - 60); // 60pxは左ボタンの幅
      if (distance < minDistance) {
        minDistance = distance;
        currentIndex = index;
      }
    });
    
    // 次/前の画像のインデックスを計算
    const targetIndex = direction === 'left' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(images.length - 1, currentIndex + 1);
    
    // 目標の画像の左端位置を計算
    const targetImage = images[targetIndex];
    const targetX = 60 - targetImage.offsetLeft; // 左ボタンの幅(60px)を考慮
    
    // スクロール範囲を制限
    const maxScroll = -(container.scrollWidth - container.clientWidth - 60);
    const limitedX = Math.max(Math.min(60, targetX), maxScroll);
    
    // アニメーションでスクロール
    container.style.transform = `translateX(${limitedX}px)`;
  };

  // クリックイベントの伝播を止める
  const handleButtonClick = (e, direction) => {
    e.stopPropagation();
    e.preventDefault();
    scroll(direction);
  };

  // 画像が読み込まれるたびに実行される関数
  const handleImageLoad = (e, imgIndex, totalImages) => {
    if (imgIndex === 0) {
      const container = scrollContainerRef.current;
      container.style.transform = 'translateX(60px)';
    }
    
    setImagesLoaded(prev => prev + 1);
    
    // すべての画像が読み込まれた後に全体の幅を計算
    if (imagesLoaded + 1 === totalImages) {
      const container = scrollContainerRef.current;
      const totalWidth = Array.from(container.querySelectorAll('img'))
        .reduce((sum, img) => sum + img.offsetWidth, 0);
      setTotalWidth(totalWidth);
    }
  };

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
      <div className="content">
        {/* top-contentが存在しない場合のみタイトルを表示 */}
        {!hasTopContent && <h2>{page.title}</h2>}

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

            case "top":
              return (
                <div key={index} className="top-content">
                                  <svg id="_レイヤー_3" data-name="レイヤー 3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 796.32 1905.69"  style={{'--custom-color': content.color}} className="topsvg">
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
                  <h2 className="custom-color" style={{'--custom-color': content.color}}>{content.title}</h2>
                  <p className="custom-color" style={{'--custom-color': content.color}}>{content.jatitle}</p>
                  <div dangerouslySetInnerHTML={{ __html: content.top }} />
                  {content.image && (
                    <>
                      <div className="top-images">
                        <button 
                          className="scroll-button-left" 
                          onClick={(e) => handleButtonClick(e, 'left')}
                          aria-label="Scroll left"
                        >
                          <FontAwesomeIcon icon={faChevronLeft} />
                        </button>
                        <div
                          ref={scrollContainerRef}
                          className="top-images-container"
                          onMouseDown={handleMouseDown}
                          onMouseMove={handleMouseMove}
                          onMouseUp={handleMouseUp}
                          onMouseLeave={handleMouseUp}
                          style={{
                            width: `${totalWidth}px`,
                            minWidth: '100%'
                          }}
                        >
                          {content.image.map((img, imgIndex) => (
                            <img
                              key={imgIndex}
                              src={`${img.url}?h=1000&q=40`}
                              alt={content.title}
                              loading="eager"
                              onClick={() => setSelectedImage(img.url)}
                              onLoad={(e) => handleImageLoad(e, imgIndex, content.image.length)}
                              style={{
                                opacity: 0,
                                animation: 'fadeIn 0.3s ease forwards',
                                animationDelay: `${imgIndex * 0.1}s`
                              }}
                            />
                          ))}
                        </div>
                        <button 
                          className="scroll-button-right" 
                          onClick={(e) => handleButtonClick(e, 'right')}
                          aria-label="Scroll right"
                        >
                          <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                      </div>
                      {selectedImage && (
                        <div className={`image-modal ${selectedImage ? 'open' : ''}`} onClick={() => setSelectedImage(null)}>
                          <div className="modal-content">
                            <button className="close-modal" onClick={() => setSelectedImage(null)}>
                              <FontAwesomeIcon icon={faTimes} />
                            </button>
                            <img src={`${selectedImage}?w=1920&q=80`} alt="拡大画像" />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );

            case "eventmanage":
              // 列数を判定する関数
              const getColumnClass = (caste) => {
                // casteが配列なので、最初の要素を取得
                const casteValue = Array.isArray(caste) ? caste[0] : caste;
                
                switch(casteValue) {
                  case "1列": return "manager-col-1";
                  case "2列": return "manager-col-2";
                  case "3列": return "manager-col-3";
                  default: return "manager-col-1"; // デフォルトは1列
                }
              };

              return (
                <div key={index} className="event-manage">
                  <h3>{content.eventname}</h3>
                  <div className="manager-container">
                    {content.manager.map((manager, mIndex) => (
                      <div key={mIndex} className={`manager ${getColumnClass(manager.caste)}`}>
                        {manager.icon && (
                          <img src={manager.icon} alt={manager.name} />
                        )}
                        <div className="manager-info">
                          <h4>{manager.name} {manager.janame && <span className="ja-name">{manager.janame}</span>}</h4>
                         
                          <div className="manager-types">
                            {/* 英語の役職を / で区切って表示 */}
                            {manager.entype && manager.entype.length > 0 && (
                              <span className="type-badgeen">
                                {manager.entype.join(" / ")}
                              </span>
                            )}
                            {/* 日本語の役職を / で区切って表示 */}
                            {manager.jatype && manager.jatype.length > 0 && (
                              <span className="type-badgeja">
                                {manager.jatype.join(" / ")}
                              </span>
                            )}
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
