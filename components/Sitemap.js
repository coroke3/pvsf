import React from 'react';

const SitemapComponent = ({ sitemap }) => {
  return (
    <div>
      <h1>サイトマップ</h1>
      <pre>{sitemap}</pre>
    </div>
  );
};

export default SitemapComponent;