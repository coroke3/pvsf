// libs/client.js
import { createClient } from 'microcms-js-sdk';

// 環境変数 API_KEY の値を取得
const apiKey = process.env.API_KEY || 'default_api_key';

export const client = createClient({
  serviceDomain: 'pvscreeningfes',
  apiKey: apiKey,
});