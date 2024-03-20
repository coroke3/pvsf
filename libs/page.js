import { client } from "./client";

export async function getAllPageIds() {
    try {
        const jsonData = await client.get({ endpoint: "page" });
      
    
      // レスポンスから動的なページのIDを抽出して返す
      return jsonData.contents.map(item => ({
        params: {
          id: item.id
        }
      }));
    } catch (error) {
      console.error('Error fetching work IDs:', error);
      return []; // エラーが発生した場合は空の配列を返す
    }
  }
  