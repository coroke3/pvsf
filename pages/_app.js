import "../styles/styles.css";
import Head from "next/head";
import Script from "next/script";
import * as gtag from "../libs/gtag";
import { createClient } from "microcms-js-sdk";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import Layout from "@/components/Layout";
import WorksSidebar from "@/components/WorksSidebar";

// microCMSクライアントの作成
const client = createClient({
  serviceDomain: process.env.NEXT_PUBLIC_SERVICE_DOMAIN,
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
});

function MyApp({ Component, pageProps }, AppProps) {
  const router = useRouter();
  const [works, setWorks] = useState([]);

  useEffect(() => {
    const handleRouterChange = (url, any) => {
      gtag.pageview(url);
    };
    router.events.on("routeChangeComplete", handleRouterChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouterChange);
    };
  }, [router.events]);

  useEffect(() => {
    // データを取得してworksにセット
    const fetchWorks = async () => {
      try {
        const res = await fetch("https://script.google.com/macros/s/AKfycbyoJtRhCw1DLnHOcbGkSd2_gXy6Zvdj-nYZbIM17sOL82BdIETte0d-hDRP7qnYyDPpAQ/exec");
        const data = await res.json();
        setWorks(data);
      } catch (error) {
        console.error("Failed to fetch works:", error);
      }
    };

    fetchWorks();
  }, []);

  // release/[id]のページかどうかを判定
  const isReleasePage = router.pathname === '/release/[id]';

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Analytics />
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_MEASUREMENT_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gtag.GA_MEASUREMENT_ID}');
          `,
        }}
      />
      <Layout>
        <div style={{}}>
          <Component {...pageProps} />
          {isReleasePage && <WorksSidebar works={works} currentId={pageProps.release?.timestamp?.toString()} />}
        </div>
      </Layout>
    </>
  );
}

export default MyApp;
