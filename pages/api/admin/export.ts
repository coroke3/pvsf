import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';

/**
 * Admin Export API - Export complete Firestore data for backup/restore
 * GET /api/admin/export?type=videos|users|all
 *
 * Returns raw Firestore documents with all fields preserved.
 * Timestamps are serialized as ISO strings for portability.
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Admin check
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userDoc = await adminDb.collection('users').where('discordId', '==', session.user.id).limit(1).get();
    if (userDoc.empty || !(userDoc.docs[0].data().role === 'admin' || userDoc.docs[0].data().isAdmin)) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { type = 'all' } = req.query;

    try {
        const result: Record<string, any> = {
            exportedAt: new Date().toISOString(),
            version: '1.0',
        };

        // Export Videos
        if (type === 'videos' || type === 'all') {
            const videos = await exportCollection('videos');
            result.videos = videos;
            result.videosCount = videos.length;
        }

        // Export Users
        if (type === 'users' || type === 'all') {
            const users = await exportCollection('users');
            result.users = users;
            result.usersCount = users.length;
        }

        // Export Events/Slots
        if (type === 'all') {
            const events = await exportCollection('events');
            result.events = events;
            result.eventsCount = events.length;
        }

        // Set headers for download
        const filename = `pvsf_backup_${type}_${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Export error:', error);
        return res.status(500).json({ error: error.message || 'Export failed' });
    }
}

/**
 * Export a full Firestore collection, preserving all fields.
 * Timestamps are converted to ISO strings for serialization.
 */
async function exportCollection(collectionName: string): Promise<any[]> {
    const docs: any[] = [];
    const batchSize = 500;
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let hasMore = true;

    while (hasMore) {
        let query: FirebaseFirestore.Query = adminDb.collection(collectionName)
            .limit(batchSize);

        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();

        for (const doc of snapshot.docs) {
            const data = doc.data();
            docs.push({
                _id: doc.id,
                ...serializeForExport(data),
            });
        }

        if (snapshot.docs.length < batchSize) {
            hasMore = false;
        } else {
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }
    }

    return docs;
}

/**
 * Recursively serialize Firestore data for JSON export.
 * Converts Timestamps to ISO strings, handles nested objects and arrays.
 */
function serializeForExport(data: any): any {
    if (data === null || data === undefined) return data;

    // Firestore Timestamp
    if (typeof data.toDate === 'function') {
        try {
            return data.toDate().toISOString();
        } catch {
            return null;
        }
    }

    // Date object
    if (data instanceof Date) {
        return isNaN(data.getTime()) ? null : data.toISOString();
    }

    // Firestore serialized timestamp ({ _seconds, _nanoseconds })
    if (typeof data === 'object' && typeof data._seconds === 'number') {
        return new Date(data._seconds * 1000).toISOString();
    }

    // Array
    if (Array.isArray(data)) {
        return data.map(item => serializeForExport(item));
    }

    // Plain object
    if (typeof data === 'object') {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
            result[key] = serializeForExport(value);
        }
        return result;
    }

    // Primitives
    return data;
}
