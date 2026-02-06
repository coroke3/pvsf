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
        let batch = adminDb.batch();
        const batchSize = 500; // Firestore limit
        let currentBatch = 0;

        for (let i = 0; i < videos.length; i++) {
            try {
                const input = videos[i] as any;
                let newVideo: any;
                let docId: string;

                if (input.ylink) {
                    // Legacy Format
                    docId = generateVideoDocId(input.ylink);
                    newVideo = convertOldToNew(input as OldVideoJson);
                } else if (input.id || input.videoUrl) {
                    // New Format (Internal Schema)
                    if (input.id) {
                        docId = input.id;
                    } else {
                        docId = generateVideoDocId(input.videoUrl);
                    }

                    // Prepare object
                    newVideo = { ...input };

                    // Cleanup / Type correction
                    delete newVideo.id; // stored in docId

                    // Arrays handling (csv/tsv import might give strings)
                    if (typeof newVideo.eventIds === 'string') {
                        newVideo.eventIds = newVideo.eventIds.split(/[,、]/).map((s: string) => s.trim()).filter(Boolean);
                    } else if (!Array.isArray(newVideo.eventIds)) {
                        newVideo.eventIds = [];
                    }

                    // Members handling (if string)
                    if (typeof newVideo.members === 'string') {
                        // Attempt to parse if looks like JSON
                        if (newVideo.members.trim().startsWith('[')) {
                            try {
                                newVideo.members = JSON.parse(newVideo.members);
                            } catch {
                                newVideo.members = [];
                            }
                        } else {
                            newVideo.members = [];
                        }
                    }

                    // timestamps
                    if (newVideo.startTime && typeof newVideo.startTime === 'string') {
                        newVideo.startTime = new Date(newVideo.startTime);
                    }

                    // Ensure defaults
                    if (!newVideo.viewCount) newVideo.viewCount = 0;
                    if (!newVideo.likeCount) newVideo.likeCount = 0;
                    if (!newVideo.privacyStatus) newVideo.privacyStatus = 'public';

                } else {
                    results.errors.push(`Item ${i}: Missing ID or URL`);
                    results.failed++;
                    continue;
                }

                // Remove undefined/null
                Object.keys(newVideo).forEach(key => {
                    if (newVideo[key] === undefined) delete newVideo[key];
                });

                const docRef = adminDb.collection('videos').doc(docId);
                batch.set(docRef, {
                    ...newVideo,
                    id: docId,
                    updatedAt: new Date(),

                }, { merge: true });



                results.success++;
                currentBatch++;

                // Commit batch if limit reached
                if (currentBatch >= batchSize) {
                    await batch.commit();
                    batch = adminDb.batch();
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
