import Document, { Html, Head, Main, NextScript } from 'next/document';
class SampleDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html lang={this.props.locale.split("-")[0]}>
        <Head>
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="../../../image/apple-touch-icon.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="../../../image/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="../../../image/favicon-16x16.png"
          />
          <link rel="manifest" href="/site.webmanifest" />
          <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000" />
          <meta name="msapplication-TileColor" content="#ffffff" />
          <meta name="theme-color" content="#ffffff" />
          <meta
            name="viewport"
            content="width=device-width,height=device-height"
            key="viewport"
          />
          <link
            rel="shortcut icon"
            href="/static/shortcut-icon.png"
            key="shortcutIcon"
          />
          <meta name="theme-color" content="#087da1" key="themeColor" />
          <link rel="dns-prefetch" href="//www.google.co.jp" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default SampleDocument;
