// Admin Cleanup API - Search and soft delete past events/videos
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = session.user as any;
    if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    // GET: Search for past events/videos
    if (req.method === 'GET') {
        try {
            const { before, type = 'videos' } = req.query;
            const beforeDate = before ? new Date(before as string) : new Date();

            let items: any[] = [];

            if (type === 'videos') {
                const snapshot = await adminDb.collection('videos')
                    .where('startTime', '<', beforeDate)
                    .where('isDeleted', '!=', true)
                    .orderBy('startTime', 'desc')
                    .limit(100)
                    .get();

                items = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    startTime: doc.data().startTime?.toDate?.() || doc.data().startTime
                }));
            } else if (type === 'events') {
                // Event slots cleanup
                const snapshot = await adminDb.collection('eventSlots')
                    .orderBy('createdAt', 'desc')
                    .limit(50)
                    .get();

                items = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const slots = data.slots || [];
                    const pastSlots = slots.filter((s: any) => new Date(s.dateTime) < beforeDate);
                    return {
                        id: doc.id,
                        eventId: data.eventId,
                        eventName: data.eventName,
                        totalSlots: slots.length,
                        pastSlots: pastSlots.length,
                        futureSlots: slots.length - pastSlots.length,
                    };
                }).filter(e => e.pastSlots > 0);
            }

            return res.status(200).json({ items, count: items.length });
        } catch (error) {
            console.error('Error fetching cleanup items:', error);
            return res.status(500).json({ error: 'Failed to fetch items' });
        }
    }

    // POST: Soft delete selected items
    if (req.method === 'POST') {
        try {
            const { ids, type = 'videos' } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: 'No IDs provided' });
            }

            const batch = adminDb.batch();
            const now = new Date();

            if (type === 'videos') {
                for (const id of ids) {
                    const ref = adminDb.collection('videos').doc(id);
                    batch.update(ref, {
                        isDeleted: true,
                        deletedAt: now,
                        deletedBy: user.id,
                    });
                }
            }

            await batch.commit();

            return res.status(200).json({
                message: `${ids.length}件のアイテムをソフト削除しました`,
                count: ids.length
            });
        } catch (error) {
            console.error('Error soft deleting items:', error);
            return res.status(500).json({ error: 'Failed to soft delete items' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
