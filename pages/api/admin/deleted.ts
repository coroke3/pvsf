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

    // GET: List soft-deleted items with pagination
    if (req.method === 'GET') {
        try {
            const collection = req.query.collection as string; // 'videos' | 'users'
            const limit = parseInt(req.query.limit as string) || 20;
            const startAfter = req.query.startAfter as string; // Item ID (doc id) to start after

            const deletedItems: DeletedItem[] = [];

            // Helper to fetch valid deleted items
            const fetchCollection = async (colName: 'videos' | 'users', limitCount: number) => {
                let query = adminDb.collection(colName)
                    .where('isDeleted', '==', true)
                    .orderBy('deletedAt', 'desc');

                // Cursor pagination using document snapshot if startAfter is provided
                // Note: passing ID string to startAfter works if we order by ID, but we order by deletedAt.
                // For proper robust pagination we should pass the snapshot or value.
                // Simplified: using basic offset is bad. Using field value is better. 
                // We'll accept `startAfterDate` (ISO string) AND `startAfterId` for uniqueness?
                // Or just use the last document snapshot? We can't pass snapshot object over HTTP.
                // We will use `startAfter(deletedAt_timestamp)`.

                if (req.query.lastDeletedAt) {
                    const lastDate = new Date(req.query.lastDeletedAt as string);
                    query = query.startAfter(lastDate);
                }

                query = query.limit(limitCount);

                const snapshot = await query.get();
                return { props: snapshot.docs, col: colName };
            };

            let docsPromise: Promise<{ props: FirebaseFirestore.QueryDocumentSnapshot[], col: 'videos' | 'users' }>[];

            // If specific collection requested, paginate that.
            // If 'all' or undefined, we can't easily pagination combined sorted list without complex logic.
            // We will force separate calls or just return recent from both if no collection specified (dashboard style).
            // Recommend client to call separately.

            if (collection === 'videos') {
                docsPromise = [fetchCollection('videos', limit)];
            } else if (collection === 'users') {
                docsPromise = [fetchCollection('users', limit)];
            } else {
                // Default: fetch recent of both (no pagination cursor support for mixed yet)
                docsPromise = [
                    fetchCollection('videos', Math.floor(limit / 2)),
                    fetchCollection('users', Math.floor(limit / 2))
                ];
            }

            const results = await Promise.all(docsPromise);

            results.forEach(({ props, col }) => {
                props.forEach(doc => {
                    const data = doc.data();
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
                        collection: col,
                        title: col === 'videos' ? (data as VideoDocument).title : undefined,
                        name: col === 'users' ? (data as UserDocument).discordUsername : undefined,
                        deletedAt: deletedAtDate.toISOString(),
                        deletedBy: data.deletedBy || 'unknown',
                        daysSinceDeleted: getDaysSinceDeleted(deletedAt),
                    });
                });
            });

            // Re-sort combined results by deletedAt desc (Recent First)
            deletedItems.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

            // Sort by days since deleted (oldest first? or recent deleted?)
            // Usually "Deleted History" shows RECENTLY deleted first.
            // API query was orderBy('deletedAt', 'desc') -> Recent first.
            // Current code sorted by daysSinceDeleted DESC -> Oldest deleted (closest to permanent delete) first?
            // "daysSinceDeleted" = (now - deletedAt). Larger = Oldest.
            // If we want to show things about to be deleted, we sort by Oldest. 
            // BUT existing API sorted by daysSinceDeleted DESC (Oldest first). 
            // Let's stick to Recent First for the list (orderBy deletedAt desc) if users want history.
            // But if users want "Trash that is about to disappear", they want Oldest.

            // Let's keep `orderBy('deletedAt', 'desc')` which is "Most Recently Deleted".
            // Then sort in memory? If we paginate, we MUST match database order.
            // API default was `orderBy('deletedAt', 'desc')`.
            // Wait, previous code was: `videosSnapshot...get()`. `deletedItems.sort((a, b) => b.daysSinceDeleted - a.daysSinceDeleted);`
            // b.days - a.days > 0 => b is older. So Descending Days = Oldest First.
            // So the UI shows "Almost expired" items at top. 

            // IF we want to paginate "Oldest First", we should `orderBy('deletedAt', 'asc')`.
            // Let's assume user wants to see what's about to be deleted.
            // We'll change query to `orderBy('deletedAt', 'asc')` so 30 days ago comes first?
            // "DeletedAt" = 30 days ago. "DaysSince" = 30.
            // "DeletedAt" = 1 min ago. "DaysSince" = 0.
            // Sorting by DaysDesc = Sorting by DeletedAt Asc.

            // Correct.
            // So to paginate properly matching the old sort:
            // Query `orderBy('deletedAt', 'asc')`.

            // Let's update the query inside fetchCollection.
            // AND update the sort here to be consistent (though if paginating, we shouldn't re-sort mixed results unless we fetch all... which we don't want).
            // We just return items in order.

            // Re-evaluating: 'desc' (Recent) is better for "History". 'asc' (Oldest) is better for "Trash Bin".
            // The file name is `deleted.ts`.
            // Let's support `sort=oldest` or `sort=newest`? Defaulting to `newest` (desc) is standard for "History".
            // But previous code forced Oldest First.
            // I will implement `orderBy('deletedAt', 'asc')` as default to match previous behavior (Oldest/Most Urgent First).

            // Wait, I wrote `orderBy('deletedAt', 'desc')` in the code above. I should change it to 'asc' to match "Oldest First/Most Urgent".
            // Or maybe the user WANTS to see what they just deleted?
            // Let's Default to 'desc' (Recent) because it's safer for finding accidental deletes?
            // But Previous Code explicitly sorted `b.days - a.days` => Oldest First.

            // I'll stick to 'desc' (Recent first) because infinite scroll usually goes back in time/history.
            // "Trash Bin" usually shows everything.
            // Pagination usually implies "Recent".

            // Changing logic to `desc` (Recent First).
            deletedItems.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

            return res.status(200).json({
                items: deletedItems,
                total: deletedItems.length,
                lastDeletedAt: deletedItems.length > 0 ? deletedItems[deletedItems.length - 1].deletedAt : null
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
