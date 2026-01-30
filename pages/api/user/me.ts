import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const session = await getServerSession(req, res, authOptions);

        if (!session?.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const discordId = (session.user as any).discordId || session.user.email; // Fallback, though discordId should be there

        if (!discordId) {
            return res.status(400).json({ error: 'User ID not found' });
        }

        const userDoc = await adminDb.collection('users').doc(discordId).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found in database' });
        }

        const userData = userDoc.data();

        // Return relevant fields
        return res.status(200).json({
            id: userData?.uid || discordId,
            discordId: userData?.discordId,
            discordUsername: userData?.discordUsername,
            discordAvatar: userData?.discordAvatar, // Use stored avatar if available
            role: userData?.role || 'user',
            xidClaims: userData?.xidClaims || [],
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
