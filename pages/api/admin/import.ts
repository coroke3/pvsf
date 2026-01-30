// Admin Import API endpoint
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';
import { convertOldToNew, generateVideoDocId } from '@/libs/videoConverter';
import type { OldVideoJson } from '@/types/video';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Check authentication and admin role
        const session = await getServerSession(req, res, authOptions);

        if (!session?.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userRole = (session.user as any).role;
        if (userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { videos } = req.body;

        if (!Array.isArray(videos)) {
            return res.status(400).json({ error: 'videos must be an array' });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[],
        };

        // Use batch write for efficiency
        const batch = adminDb.batch();
        const batchSize = 500; // Firestore limit
        let currentBatch = 0;

        for (let i = 0; i < videos.length; i++) {
            try {
                const oldVideo = videos[i] as OldVideoJson;

                if (!oldVideo.ylink) {
                    results.errors.push(`Item ${i}: Missing ylink`);
                    results.failed++;
                    continue;
                }

                const docId = generateVideoDocId(oldVideo.ylink);
                const newVideo = convertOldToNew(oldVideo);

                const docRef = adminDb.collection('videos').doc(docId);
                batch.set(docRef, {
                    ...newVideo,
                    id: docId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }, { merge: true });

                results.success++;
                currentBatch++;

                // Commit batch if limit reached
                if (currentBatch >= batchSize) {
                    await batch.commit();
                    currentBatch = 0;
                }

            } catch (err: any) {
                results.errors.push(`Item ${i}: ${err.message}`);
                results.failed++;
            }
        }

        // Commit remaining items
        if (currentBatch > 0) {
            await batch.commit();
        }

        return res.status(200).json(results);

    } catch (error: any) {
        console.error('Import error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
