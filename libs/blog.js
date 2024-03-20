import { client } from "./client";

export async function getAllBlogIds() {
    try {
        const jsonData = await client.get({ endpoint: "blog" });
      
      return jsonData.contents.map(item => ({
        params: {
          id: item.id
        }
      }));
    } catch (error) {
      console.error('Error fetching work Blogs:', error);
      return []; // エラーが発生した場合は空の配列を返す
    }
  }
  