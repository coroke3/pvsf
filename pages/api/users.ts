import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/libs/firebase-admin';
import { transformUserToLegacy } from '@/libs/transformers';
import type { UserDocument } from '@/types/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // 1. Fetch users with X Link
    // Note: We might want to limit this if user count grows, but for legacy dumping full list often happened.
    const snapshot = await adminDb
      .collection('users')
      .where('xLink.status', '==', 'linked')
      .get();

    // 2. Transform
    const users = snapshot.docs.map(doc => {
      const data = doc.data() as UserDocument;
      return transformUserToLegacy({ ...data, id: doc.id });
    });

    // 3. Cache
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return res.status(200).json(users);

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
