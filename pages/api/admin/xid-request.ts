// Admin: Handle XID Claim Request (Approve/Reject)
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';
import type { XidClaim } from '@/types/user';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const session = await getServerSession(req, res, authOptions);

        if (!session?.user || (session.user as any).role !== 'admin') {
            return res.status(401).json({ error: 'Unauthorized: Admin access required' });
        }

        const { userId, xid, action } = req.body;

        if (!userId || !xid || !['approve', 'reject', 'revoke'].includes(action)) {
            return res.status(400).json({ error: 'Invalid parameters' });
        }

        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        let claims: XidClaim[] = userData?.xidClaims || [];

        if (action === 'revoke') {
            // Remove the claim entirely
            const initialLength = claims.length;
            claims = claims.filter(c => c.xid !== xid);

            if (claims.length === initialLength) {
                return res.status(400).json({ error: 'Claim not found' });
            }
        } else {
            const updatedClaims = claims.map(claim => {
                if (claim.xid === xid && claim.status === 'pending') {
                    return {
                        ...claim,
                        status: (action === 'approve' ? 'approved' : 'rejected') as 'approved' | 'rejected', // Explicit cast
                        processedAt: new Date(),
                        processedBy: session.user?.name || 'Admin',
                    };
                }
                return claim;
            });

            // Check if anything changed
            if (JSON.stringify(claims) === JSON.stringify(updatedClaims)) {
                return res.status(400).json({ error: 'Claim not found or status not pending' });
            }
            claims = updatedClaims;
        }

        await userRef.update({
            xidClaims: claims,
            updatedAt: new Date(),
        });

        return res.status(200).json({ success: true, message: `Claim ${action}d` });

    } catch (error) {
        console.error('Admin XID request error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
