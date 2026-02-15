// API to get past icons for a user based on their XID
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/libs/firebase-admin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { xid } = req.query;
  if (!xid || typeof xid !== 'string') {
    return res.status(400).json({ error: 'xid query parameter is required' });
  }

  try {
    const xidLower = xid.toLowerCase();

    // Find videos by this author XID
    const snapshot = await adminDb.collection('videos')
      .where('authorXidLower', '==', xidLower)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const icons: string[] = [];
    const seen = new Set<string>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.authorIconUrl && !seen.has(data.authorIconUrl)) {
        seen.add(data.authorIconUrl);
        icons.push(data.authorIconUrl);
      }
    });

    return res.status(200).json({ icons });
  } catch (error: any) {
    console.error('Error fetching user icons:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
