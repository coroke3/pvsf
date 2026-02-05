// Next.js カスタムエラーページ (404, 500 等)
import Link from 'next/link';
import Head from 'next/head';

function Error({ statusCode }) {
  const title = statusCode === 404 ? 'ページが見つかりません' : 'エラーが発生しました';
  const message =
    statusCode === 404
      ? 'お探しのページは存在しないか、移動した可能性があります。'
      : statusCode
      ? `サーバーでエラーが発生しました (${statusCode})`
      : 'クライアント側でエラーが発生しました。';

  return (
    <>
      <Head>
        <title>{title} | PVSF</title>
      </Head>
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{title}</h1>
        <p style={{ marginBottom: '1.5rem', color: '#666' }}>{message}</p>
        <Link
          href="/"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#333',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          トップページに戻る
        </Link>
      </div>
    </>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
