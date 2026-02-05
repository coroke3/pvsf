// default open-next.config.ts file created by @opennextjs/cloudflare
// R2 バケット未設定のため staticAssetsIncrementalCache を使用（ISR は無効、デプロイごとに再生成）
// R2 を設定する場合は r2IncrementalCache に変更し wrangler.jsonc に r2_buckets を追加
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
    incrementalCache: staticAssetsIncrementalCache,
});
