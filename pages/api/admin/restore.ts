import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb', // Large backups
        },
    },
};

// Date fields that should be converted from ISO string back to Firestore Timestamp
const DATE_FIELDS_VIDEO = [
    'startTime', 'timestamp', 'createdAt', 'updatedAt',
    'lastStatsFetch', 'deletedAt', 'approvedAt',
];

const DATE_FIELDS_USER = [
    'createdAt', 'updatedAt', 'lastLogin',
];

/**
 * Admin Restore API - Import complete Firestore data from backup
 * POST /api/admin/restore
 * Body: { type: 'videos' | 'users' | 'all', data: backupJson, mode: 'merge' | 'overwrite', dryRun?: boolean }
 *
 * - merge: Only add/update documents (preserves existing data not in backup)
 * - overwrite: Replace documents completely
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Admin check
    const session = await getServerSession(req, res, authOptions);
    const user = session?.user as any;
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userDoc = await adminDb.collection('users').where('discordId', '==', user.id).limit(1).get();
    if (userDoc.empty || !(userDoc.docs[0].data().role === 'admin' || userDoc.docs[0].data().isAdmin)) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { type, data, mode = 'merge', dryRun = false } = req.body;

    if (!type || !data) {
        return res.status(400).json({ error: 'type and data are required' });
    }

    try {
        const result: Record<string, any> = {
            dryRun,
            mode,
            timestamp: new Date().toISOString(),
        };

        if (type === 'videos' || type === 'all') {
            const videos = type === 'all' ? data.videos : data;
            if (Array.isArray(videos)) {
                result.videos = await restoreCollection('videos', videos, DATE_FIELDS_VIDEO, mode, dryRun);
            }
        }

        if (type === 'users' || type === 'all') {
            const users = type === 'all' ? data.users : data;
            if (Array.isArray(users)) {
                result.users = await restoreCollection('users', users, DATE_FIELDS_USER, mode, dryRun);
            }
        }

        if (type === 'all' && data.events) {
            if (Array.isArray(data.events)) {
                result.events = await restoreCollection('events', data.events, ['createdAt', 'updatedAt'], mode, dryRun);
            }
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Restore error:', error);
        return res.status(500).json({ error: error.message || 'Restore failed' });
    }
}

/**
 * Restore a collection from backup data
 */
async function restoreCollection(
    collectionName: string,
    documents: any[],
    dateFields: string[],
    mode: string,
    dryRun: boolean
): Promise<{ imported: number; skipped: number; errors: number; total: number; errorDetails: any[] }> {
    const BATCH_SIZE = 450; // Firestore batch limit is 500
    let imported = 0;
    let skipped = 0;
    let errorCount = 0;
    const errorDetails: { index: number; id: string; message: string }[] = [];

    for (let batchStart = 0; batchStart < documents.length; batchStart += BATCH_SIZE) {
        const batch = dryRun ? null : adminDb.batch();
        const batchEnd = Math.min(batchStart + BATCH_SIZE, documents.length);

        for (let i = batchStart; i < batchEnd; i++) {
            const doc = documents[i];

            try {
                // Extract document ID
                const docId = doc._id || doc.id;
                if (!docId) {
                    skipped++;
                    continue;
                }

                // Prepare document data (remove _id helper field)
                const { _id, ...docData } = doc;

                // Convert date strings back to Firestore Timestamps
                const firestoreData = deserializeForRestore(docData, dateFields);

                if (!dryRun && batch) {
                    const docRef = adminDb.collection(collectionName).doc(docId);
                    if (mode === 'merge') {
                        batch.set(docRef, firestoreData, { merge: true });
                    } else {
                        batch.set(docRef, firestoreData);
                    }
                }

                imported++;
            } catch (error: any) {
                errorCount++;
                errorDetails.push({
                    index: i,
                    id: doc._id || doc.id || 'unknown',
                    message: error.message || 'Unknown error',
                });
            }
        }

        if (!dryRun && batch) {
            try {
                await batch.commit();
            } catch (error: any) {
                errorCount += (batchEnd - batchStart);
                errorDetails.push({
                    index: batchStart,
                    id: 'batch',
                    message: `Batch commit failed: ${error.message}`,
                });
            }
        }
    }

    return {
        imported,
        skipped,
        errors: errorCount,
        total: documents.length,
        errorDetails: errorDetails.slice(0, 50),
    };
}

/**
 * Convert exported data back to Firestore format.
 * ISO date strings in known fields are converted to Firestore Timestamps.
 */
function deserializeForRestore(data: any, dateFields: string[]): any {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
        return data.map(item => deserializeForRestore(item, dateFields));
    }

    if (typeof data === 'object') {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
            if (dateFields.includes(key) && typeof value === 'string') {
                // Convert ISO string back to Date (Firestore will auto-convert to Timestamp)
                const date = new Date(value);
                result[key] = isNaN(date.getTime()) ? null : date;
            } else if (typeof value === 'object' && value !== null) {
                result[key] = deserializeForRestore(value, dateFields);
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    return data;
}
