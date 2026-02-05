// default open-next.config.ts file created by @opennextjs/cloudflare
// R2 バケット未設定のため staticAssetsIncrementalCache を使用（ISR は無効、デプロイごとに再生成）
// R2 を設定する場合は r2IncrementalCache に変更し wrangler.workers.jsonc に r2_buckets を追加
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

const config = defineCloudflareConfig({
    incrementalCache: staticAssetsIncrementalCache,
});
// @emotion/react 等の workerd 非対応パッケージは Node 解決を使用（ビルド成功のため必須）
config.cloudflare = { ...config.cloudflare, useWorkerdCondition: false };
export default config;