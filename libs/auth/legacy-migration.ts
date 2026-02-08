import { adminDb } from '@/libs/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Migrate Permissions for a matched XID
 * 1. Verify XID exists in `legacy_users`.
 * 2. Find all videos where `authorXid` matches.
 * 3. Add the Discord User ID to `ownerIds` array of those videos.
 */
export const migrateLegacyPermissions = async (discordUserId: string, xid: string) => {
  try {
    const xidLower = xid.toLowerCase();

    // 1. Check Legacy User Existence
    const legacyUserDoc = await adminDb.collection('legacy_users').doc(xidLower).get();
    if (!legacyUserDoc.exists) {
      return { success: false, reason: 'Legacy user not found' };
    }

    // 2. Find associated videos (published or otherwise)
    const videosSnapshot = await adminDb
      .collection('videos')
      .where('authorXid', '==', xid)
      .get();
      
    if (videosSnapshot.empty) {
        return { success: true, count: 0, message: 'No videos found for this ID' };
    }

    // 3. Update Videos (Batch)
    const batch = adminDb.batch();
    
    videosSnapshot.docs.forEach(doc => {
        const videoRef = adminDb.collection('videos').doc(doc.id);
        batch.set(videoRef, {
            ownerIds: FieldValue.arrayUnion(discordUserId),
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
    });

    await batch.commit();

    return { success: true, count: videosSnapshot.size, message: `Migrated ${videosSnapshot.size} videos` };

  } catch (error) {
    console.error('Migration Error:', error);
    throw error;
  }
};
