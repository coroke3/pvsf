// API to fetch admin dashboard statistics (counts)
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify admin access
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const user = session.user as any;
    if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        // Run aggregation queries in parallel
        // Note: count() queries are efficient and don't download documents
        const [videosSnapshot, usersSnapshot, slotsSnapshot] = await Promise.all([
            adminDb.collection('videos').count().get(),
            adminDb.collection('users').count().get(),
            adminDb.collection('eventSlots').count().get()
        ]);

        return res.status(200).json({
            videoCount: videosSnapshot.data().count,
            userCount: usersSnapshot.data().count,
            slotCount: slotsSnapshot.data().count,
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return res.status(500).json({ error: 'Failed to fetch statistics' });
    }
}
