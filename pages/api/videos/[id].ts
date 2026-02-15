// Video detail / update / delete API endpoint
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';
import { logUpdate, logDelete } from '@/libs/operationLog';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  const session = await getServerSession(req, res, authOptions);
  const user = session?.user as any;

  // GET - get video details
  if (req.method === 'GET') {
    try {
      const docRef = adminDb.collection('videos').doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: 'Video not found' });
      }
      const data = docSnap.data();
      return res.status(200).json({ id: docSnap.id, ...data });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Auth required for mutations
  if (!user) {
    return res.status(401).json({ error: 'ログインが必要です' });
  }

  const isAdmin = user.role === 'admin';

  // PUT - update video
  if (req.method === 'PUT') {
    try {
      const docRef = adminDb.collection('videos').doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: 'Video not found' });
      }

      const existingData = docSnap.data()!;

      // Permission check (non-admin)
      if (!isAdmin) {
        const userXids = (user.xidClaims || [])
          .filter((c: any) => c.status === 'approved')
          .map((c: any) => c.xid.toLowerCase());
        const authorXidLower = (existingData.authorXidLower || '').toLowerCase();
        const isAuthor = userXids.includes(authorXidLower);
        const isMemberApproved = (existingData.members || []).some(
          (m: any) => userXids.includes((m.xid || '').toLowerCase()) && m.editApproved
        );

        if (!isAuthor && !isMemberApproved) {
          return res.status(403).json({ error: 'この作品を編集する権限がありません' });
        }
      }

      // Log the change
      await logUpdate(
        'videos',
        id,
        existingData as Record<string, unknown>,
        req.body,
        user.discordId || user.id,
      );

      const updateData: Record<string, any> = { ...req.body, updatedAt: new Date() };

      // Normalize authorXid
      if (updateData.authorXid) {
        updateData.authorXidLower = updateData.authorXid.toLowerCase();
      }

      await docRef.update(updateData);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // PATCH - special actions (approve, restore)
  if (req.method === 'PATCH') {
    if (!isAdmin) {
      return res.status(403).json({ error: '管理者権限が必要です' });
    }

    try {
      const docRef = adminDb.collection('videos').doc(id);
      const { approve, restore } = req.body;

      if (approve) {
        await docRef.update({
          isApproved: true,
          approvedAt: new Date(),
          approvedBy: user.discordId || user.id,
          updatedAt: new Date(),
        });
        return res.status(200).json({ success: true, message: '承認しました' });
      }

      if (restore) {
        await docRef.update({
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          updatedAt: new Date(),
        });
        return res.status(200).json({ success: true, message: '復元しました' });
      }

      return res.status(400).json({ error: 'Unknown action' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // DELETE - soft delete
  if (req.method === 'DELETE') {
    try {
      const docRef = adminDb.collection('videos').doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: 'Video not found' });
      }

      const existingData = docSnap.data()!;

      // Permission check
      if (!isAdmin) {
        const userXids = (user.xidClaims || [])
          .filter((c: any) => c.status === 'approved')
          .map((c: any) => c.xid.toLowerCase());
        const authorXidLower = (existingData.authorXidLower || '').toLowerCase();
        if (!userXids.includes(authorXidLower)) {
          return res.status(403).json({ error: 'この作品を削除する権限がありません' });
        }
      }

      // Log for recovery
      await logDelete(
        'videos',
        id,
        existingData as Record<string, unknown>,
        user.discordId || user.id,
      );

      await docRef.update({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.discordId || user.id,
        updatedAt: new Date(),
      });

      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
