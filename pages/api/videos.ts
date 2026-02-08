import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/libs/firebase-admin'; 
import { transformVideoToLegacy } from '@/libs/transformers';
import type { VideoDocument } from '@/types/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // 1. Fetch published videos
    const snapshot = await adminDb
      .collection('videos')
      .where('status', '==', 'published')
      .orderBy('scheduledAt', 'desc')
      .get();

    // 2. Transform to legacy format
    const videos = snapshot.docs.map(doc => {
      const data = doc.data() as VideoDocument;
      return transformVideoToLegacy({ ...data, id: doc.id });
    });

    // 3. Set Cache Headers (ISR/CDN Caching)
    // s-maxage=60: Shared cache (CDN) for 60 seconds
    // stale-while-revalidate=300: Serve stale content for up to 5 minutes while fetching new data
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    // 4. Return JSON
    return res.status(200).json(videos);

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
