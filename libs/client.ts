// libs/client.js
import { createClient } from 'microcms-js-sdk';

// APIキーが文字列であることを保証してからcreateClientを呼び出す
const apiKey = process.env.API_KEY;

let client;
if (typeof apiKey === 'string') {
  client = createClient({
    serviceDomain: 'pvscreeningfes',
    apiKey: apiKey,
  });
} else {
  // APIキーが未定義または文字列ではない場合のエラー処理を行う
  throw new Error('API_KEY is not defined or not a valid string in the environment variables.');
}

export default client;