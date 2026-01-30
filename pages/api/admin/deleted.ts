// Admin: Manage soft-deleted data (list, restore, permanently delete)
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';
import type { VideoDocument } from '@/types/video';
import type { UserDocument } from '@/types/user';
import { getDaysSinceDeleted } from '@/types/common';

interface DeletedItem {
    id: string;
    collection: 'videos' | 'users';
    title?: string;
    name?: string;
    deletedAt: string;
    deletedBy: string;
    daysSinceDeleted: number;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Verify admin access
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user || (session.user as any).role !== 'admin') {
        return res.status(401).json({ error: 'Unauthorized: Admin access required' });
    }

    const user = session.user as any;

    // GET: List all soft-deleted items
    if (req.method === 'GET') {
        try {
            const deletedItems: DeletedItem[] = [];

            // Get deleted videos
            const videosSnapshot = await adminDb.collection('videos')
                .where('isDeleted', '==', true)
                .get();

            videosSnapshot.docs.forEach(doc => {
                const data = doc.data() as VideoDocument;
                const deletedAt = data.deletedAt;
                
                // Convert Firestore Timestamp
                let deletedAtDate: Date;
                if (deletedAt instanceof Date) {
                    deletedAtDate = deletedAt;
                } else if (typeof (deletedAt as any)?.toDate === 'function') {
                    deletedAtDate = (deletedAt as any).toDate();
                } else if (typeof (deletedAt as any)?._seconds === 'number') {
                    deletedAtDate = new Date((deletedAt as any)._seconds * 1000);
                } else {
                    deletedAtDate = new Date(deletedAt as any);
                }

                deletedItems.push({
                    id: doc.id,
                    collection: 'videos',
                    title: data.title,
                    deletedAt: deletedAtDate.toISOString(),
                    deletedBy: data.deletedBy || 'unknown',
                    daysSinceDeleted: getDaysSinceDeleted(deletedAt),
                });
            });

            // Get deleted users
            const usersSnapshot = await adminDb.collection('users')
                .where('isDeleted', '==', true)
                .get();

            usersSnapshot.docs.forEach(doc => {
                const data = doc.data() as UserDocument;
                const deletedAt = data.deletedAt;
                
                // Convert Firestore Timestamp
                let deletedAtDate: Date;
                if (deletedAt instanceof Date) {
                    deletedAtDate = deletedAt;
                } else if (typeof (deletedAt as any)?.toDate === 'function') {
                    deletedAtDate = (deletedAt as any).toDate();
                } else if (typeof (deletedAt as any)?._seconds === 'number') {
                    deletedAtDate = new Date((deletedAt as any)._seconds * 1000);
                } else {
                    deletedAtDate = new Date(deletedAt as any);
                }

                deletedItems.push({
                    id: doc.id,
                    collection: 'users',
                    name: data.discordUsername,
                    deletedAt: deletedAtDate.toISOString(),
                    deletedBy: data.deletedBy || 'unknown',
                    daysSinceDeleted: getDaysSinceDeleted(deletedAt),
                });
            });

            // Sort by days since deleted (oldest first)
            deletedItems.sort((a, b) => b.daysSinceDeleted - a.daysSinceDeleted);

            return res.status(200).json({
                items: deletedItems,
                total: deletedItems.length,
            });
        } catch (error) {
            console.error('Error fetching deleted items:', error);
            return res.status(500).json({ error: 'Failed to fetch deleted items' });
        }
    }

    // POST: Restore soft-deleted item
    if (req.method === 'POST') {
        const { collection, id } = req.body;

        if (!collection || !id) {
            return res.status(400).json({ error: 'collection and id are required' });
        }

        if (!['videos', 'users'].includes(collection)) {
            return res.status(400).json({ error: 'Invalid collection' });
        }

        try {
            const docRef = adminDb.collection(collection).doc(id);
            const doc = await docRef.get();

            if (!doc.exists) {
                return res.status(404).json({ error: 'Item not found' });
            }

            const data = doc.data();
            if (!data?.isDeleted) {
                return res.status(400).json({ error: 'Item is not deleted' });
            }

            // Restore the item
            await docRef.update({
                isDeleted: false,
                deletedAt: null,
                deletedBy: null,
                updatedAt: new Date(),
            });

            return res.status(200).json({
                success: true,
                message: 'Item restored successfully',
            });
        } catch (error) {
            console.error('Error restoring item:', error);
            return res.status(500).json({ error: 'Failed to restore item' });
        }
    }

    // DELETE: Permanently delete item
    if (req.method === 'DELETE') {
        const { collection, id, force } = req.body;

        if (!collection || !id) {
            return res.status(400).json({ error: 'collection and id are required' });
        }

        if (!['videos', 'users'].includes(collection)) {
            return res.status(400).json({ error: 'Invalid collection' });
        }

        try {
            const docRef = adminDb.collection(collection).doc(id);
            const doc = await docRef.get();

            if (!doc.exists) {
                return res.status(404).json({ error: 'Item not found' });
            }

            const data = doc.data();
            
            // Check if item is soft-deleted
            if (!data?.isDeleted) {
                return res.status(400).json({ 
                    error: 'Item must be soft-deleted first before permanent deletion' 
                });
            }

            // Check if 30 days have passed (unless force is true)
            const daysSinceDeleted = getDaysSinceDeleted(data.deletedAt);
            if (daysSinceDeleted < 30 && !force) {
                return res.status(400).json({
                    error: `Item can only be permanently deleted after 30 days (${daysSinceDeleted} days elapsed). Use force=true to override.`,
                    daysSinceDeleted,
                });
            }

            // Permanently delete
            await docRef.delete();

            return res.status(200).json({
                success: true,
                message: 'Item permanently deleted',
            });
        } catch (error) {
            console.error('Error permanently deleting item:', error);
            return res.status(500).json({ error: 'Failed to permanently delete item' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
