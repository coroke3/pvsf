import "../styles.css";
import Head from "next/head";
import Script from "next/script";
import * as gtag from "../libs/gtag";
import { createClient } from "microcms-js-sdk";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from 'next-themes'


function MyApp({ Component, pageProps }, AppProps) {
  const router = useRouter();
  useEffect(() => {
    const handleRouterChange = (url, any) => {
      gtag.pageview(url);
    };
    router.events.on("routeChangeComplete", handleRouterChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouterChange);
    };
  }, [router.events]);
  return (
    <>
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
      <ThemeProvider  disableTransitionOnChange>
        <Component {...pageProps} />
      </ThemeProvider>
    </>
  );
}

export default MyApp;
