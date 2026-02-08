import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';
import { migrateLegacyPermissions } from '@/libs/auth/legacy-migration';

interface ExtendedUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Auth Check
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as ExtendedUser;
  if (!user.id) {
    return res.status(401).json({ error: 'User ID not found' });
  }

  const { xid } = req.body;
  if (!xid || typeof xid !== 'string') {
    return res.status(400).json({ error: 'XID is required' });
  }

  // Normalize
  const cleanXid = xid.replace(/@/g, '').trim().toLowerCase();
  const discordUserId = user.id;

  try {
    // 2. Save Link Request to User Profile
    await adminDb.collection('users').doc(discordUserId).set({
        xLink: {
            status: 'pending',
            xid: cleanXid,
            requestedAt: new Date(),
        }
    }, { merge: true });

    // 3. Attempt Legacy Migration (Auto-Approve Logic)
    const migrationResult = await migrateLegacyPermissions(discordUserId, cleanXid);

    if (migrationResult.success) {
        if (migrationResult.count && migrationResult.count > 0) {
             await adminDb.collection('users').doc(discordUserId).set({
                xLink: { status: 'linked', linkedAt: new Date() }
            }, { merge: true });
        }
        return res.status(200).json({ success: true, migration: migrationResult });
    } else {
        return res.status(200).json({ success: true, message: 'Request saved, no legacy data found' });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
