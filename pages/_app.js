import "../styles/styles.css";
import "../styles/worksSidebar.css";
import Head from "next/head";
import Script from "next/script";
import * as gtag from "../libs/gtag";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import Layout from "@/components/Layout";

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [scrollPosition, setScrollPosition] = useState(0);

  // pagePropsからworksを取得
  const works = pageProps.works || [];

  useEffect(() => {
    const handleRouterChange = (url) => {
      gtag.pageview(url);
    };
    router.events.on("routeChangeComplete", handleRouterChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouterChange);
    };
  }, [router.events]);

  useEffect(() => {
    const handleRouteChangeStart = () => {
      setScrollPosition(window.scrollY);
    };

    const handleRouteChangeComplete = () => {
      window.scrollTo(0, scrollPosition);
    };

    router.events.on("routeChangeStart", handleRouteChangeStart);
    router.events.on("routeChangeComplete", handleRouteChangeComplete);

    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
      router.events.off("routeChangeComplete", handleRouteChangeComplete);
    };
  }, [router.events, scrollPosition]);

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
      <Layout works={works}>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}

export default MyApp;
