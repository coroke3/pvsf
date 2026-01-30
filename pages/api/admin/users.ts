// Admin: Manage users (list, delete)
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';
import type { UserDocument } from '@/types/user';

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

    // GET: List all users (excluding soft-deleted by default)
    if (req.method === 'GET') {
        try {
            const { includeDeleted } = req.query;
            const statsSnapshot = await adminDb.collection('users').get();

            const users = statsSnapshot.docs
                .filter(doc => {
                    const data = doc.data() as UserDocument;
                    // Include deleted only if explicitly requested
                    if (includeDeleted !== 'true' && data.isDeleted) {
                        return false;
                    }
                    return true;
                })
                .map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        // Ensure dates are strings for JSON serialization
                        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
                        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
                        deletedAt: data.deletedAt?.toDate?.()?.toISOString() || null,
                    };
                });

            return res.status(200).json({ users });
        } catch (error) {
            console.error('Admin users fetch error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // DELETE: Soft-delete a user
    if (req.method === 'DELETE') {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        try {
            const userDoc = await adminDb.collection('users').doc(userId).get();

            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User not found' });
            }

            const userData = userDoc.data() as UserDocument;

            if (userData.isDeleted) {
                return res.status(400).json({ error: 'User is already deleted' });
            }

            // Soft-delete the user
            await adminDb.collection('users').doc(userId).update({
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: user.id || user.discordId || 'admin',
                updatedAt: new Date(),
            });

            return res.status(200).json({
                success: true,
                message: 'User soft-deleted successfully. Will be permanently deleted after 30 days.'
            });
        } catch (error) {
            console.error('Admin user delete error:', error);
            return res.status(500).json({ error: 'Failed to delete user' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
