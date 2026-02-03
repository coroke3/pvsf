// User Settings API endpoint
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow PUT method
    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get session
        const session = await getServerSession(req, res, authOptions);

        if (!session?.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const discordId = (session.user as any).discordId;
        if (!discordId) {
            return res.status(400).json({ error: 'Discord ID not found' });
        }

        const { defaultIconUrl } = req.body;

        // Validate defaultIconUrl
        if (defaultIconUrl !== null && defaultIconUrl !== undefined) {
            if (typeof defaultIconUrl !== 'string') {
                return res.status(400).json({ error: 'Invalid defaultIconUrl format' });
            }
            // Allow Firebase Storage URLs and empty string (for removal)
            if (defaultIconUrl !== '' &&
                !defaultIconUrl.startsWith('https://firebasestorage.googleapis.com') &&
                !defaultIconUrl.startsWith('gs://')) {
                return res.status(400).json({ error: 'Invalid icon URL' });
            }
        }

        // Get current user document
        const userRef = adminDb.collection('users').doc(discordId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user settings
        await userRef.update({
            defaultIconUrl: defaultIconUrl || null,
            updatedAt: new Date(),
        });

        return res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
        });

    } catch (error) {
        console.error('User settings error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
