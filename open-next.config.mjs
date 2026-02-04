// @ts-nocheck
// OpenNext configuration for Cloudflare Pages
// Using .mjs to avoid TypeScript compilation issues during Next.js build

/** @type {import('@opennextjs/cloudflare').OpenNextConfig} */
export default {
    // Default configuration - no R2 cache for simplicity
    // If you want to use R2 incremental cache, uncomment the following:
    // import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
    // import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
    // export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
};
