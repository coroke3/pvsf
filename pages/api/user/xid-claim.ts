// XID Claim API endpoint
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
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

        const { xid } = req.body;

        if (!xid || typeof xid !== 'string') {
            return res.status(400).json({ error: 'XID is required' });
        }

        // Clean XID (remove @ if present)
        const cleanXid = xid.replace(/^@/, '').trim().toLowerCase();

        if (!cleanXid) {
            return res.status(400).json({ error: 'Invalid XID' });
        }

        // Check if XID is already claimed by another user
        const usersSnapshot = await adminDb
            .collection('users')
            .where('xidClaims', 'array-contains', { xid: cleanXid, status: 'approved' })
            .get();

        if (!usersSnapshot.empty) {
            const existingUser = usersSnapshot.docs[0];
            if (existingUser.id !== discordId) {
                return res.status(400).json({ error: 'このXIDは既に他のユーザーに登録されています' });
            }
        }

        // Get current user document
        const userRef = adminDb.collection('users').doc(discordId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        const existingClaims = userData?.xidClaims || [];

        // Check if XID already claimed by this user
        const alreadyClaimed = existingClaims.some(
            (claim: any) => claim.xid.toLowerCase() === cleanXid
        );

        if (alreadyClaimed) {
            return res.status(400).json({ error: 'このXIDは既に申請済みです' });
        }

        // Add new claim
        const newClaim = {
            xid: cleanXid,
            status: 'pending',
            requestedAt: new Date(),
        };

        await userRef.update({
            xidClaims: FieldValue.arrayUnion(newClaim),
            updatedAt: new Date(),
        });

        return res.status(200).json({
            success: true,
            message: 'XID claim submitted successfully',
            claim: newClaim
        });

    } catch (error) {
        console.error('XID Claim error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
