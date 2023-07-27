// libs/client.js
import { createClient } from 'microcms-js-sdk';

export const client = createClient({
  serviceDomain: 'pvscreeningfes'
  apiKey: process.env.API_KEY,
});