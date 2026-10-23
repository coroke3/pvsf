import { createClient } from "microcms-js-sdk";

// Cloudflare Pages preview environments use private names, while older
// production builds still provide NEXT_PUBLIC_* names.
// Prefer the private variables to avoid relying on public build-time keys.
export const client = createClient({
  serviceDomain: process.env.SERVICE_DOMAIN || process.env.NEXT_PUBLIC_SERVICE_DOMAIN || "",
  apiKey: process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "",
});
