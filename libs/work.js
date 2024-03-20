// lib/work.js
export const runtime = 'experimental-edge';

export async function getAllWorkIds() {
    try {
      // 外部APIからデータを取得
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbyEph6zXb1IWFRLpTRLNLtxU4Kj7oe10bt2ifiyK09a6nM13PASsaBYFe9YpDj9OEkKTw/exec"
      );
      const jsonData = await response.json(); // レスポンスデータをjsonDataとして格納
      
    
      // レスポンスから動的なページのIDを抽出して返す
      return jsonData.map(item => ({
        params: {
          id: item.ylink.slice(17, 28).toString()
        }
      }));
    } catch (error) {
      console.error('Error fetching work IDs:', error);
      return []; // エラーが発生した場合は空の配列を返す
    }
  }
  
