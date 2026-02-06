// Single video API endpoint with XID-based authorization
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';
import type { VideoDocument, VideoMember } from '@/types/video';
import type { XidClaim } from '@/types/user';

interface EditPermissionResult {
    canEdit: boolean;
    isAuthor: boolean;
    isMember: boolean;
    memberApproved: boolean;
}

/**
 * Check if user can edit a video based on XID claims
 * - Author: Always can edit
 * - Member: Only if editApproved is true
 */
function checkEditPermission(
    userRole: string | undefined,
    userXidClaims: XidClaim[] | undefined,
    videoAuthorXid: string | undefined,
    videoAuthorXidLower: string | undefined,
    videoMembers: VideoMember[] | undefined
): EditPermissionResult {
    const result: EditPermissionResult = {
        canEdit: false,
        isAuthor: false,
        isMember: false,
        memberApproved: false,
    };

    // Admins can edit anything
    if (userRole === 'admin') {
        result.canEdit = true;
        return result;
    }

    // No XID claims means no edit permission
    if (!userXidClaims || userXidClaims.length === 0) {
        return result;
    }

    // Get approved XIDs (case-insensitive)
    const approvedXidsLower = userXidClaims
        .filter(claim => claim.status === 'approved')
        .map(claim => claim.xid.toLowerCase());

    if (approvedXidsLower.length === 0) {
        return result;
    }

    // Check 1: Match against video author (tlink)
    const authorXidLower = videoAuthorXidLower || (videoAuthorXid?.toLowerCase() ?? '');
    if (authorXidLower && approvedXidsLower.includes(authorXidLower)) {
        result.isAuthor = true;
        result.canEdit = true;
        return result;
    }

    // Check 2: Match against video members (memberid)
    // Members can only edit if editApproved is true
    if (videoMembers && Array.isArray(videoMembers)) {
        for (const member of videoMembers) {
            if (member.xid) {
                const memberXidLower = member.xid.toLowerCase();
                if (approvedXidsLower.includes(memberXidLower)) {
                    result.isMember = true;
                    // Check if this member is approved to edit
                    if (member.editApproved === true) {
                        result.memberApproved = true;
                        result.canEdit = true;
                    }
                    break;
                }
            }
        }
    }

    return result;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Video ID is required' });
    }

    // GET: Retrieve single video
    if (req.method === 'GET') {
        try {
            const videoDoc = await adminDb.collection('videos').doc(id).get();

            if (!videoDoc.exists) {
                return res.status(404).json({ error: 'Video not found' });
            }

            const video = videoDoc.data() as VideoDocument;

            // Check if soft-deleted (only admins can view deleted videos with special param)
            if (video.isDeleted) {
                const session = await getServerSession(req, res, authOptions);
                const user = session?.user as any;
                const { includeDeleted } = req.query;

                if (user?.role !== 'admin' || includeDeleted !== 'true') {
                    return res.status(404).json({ error: 'Video not found' });
                }
            }

            return res.status(200).json({ ...video, id: videoDoc.id });

        } catch (error) {
            console.error('Error fetching video:', error);
            return res.status(500).json({ error: 'Failed to fetch video' });
        }
    }

    // PUT: Update video (requires XID match or admin)
    if (req.method === 'PUT') {
        const session = await getServerSession(req, res, authOptions);

        if (!session?.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            // Fetch current video
            const videoDoc = await adminDb.collection('videos').doc(id).get();

            if (!videoDoc.exists) {
                return res.status(404).json({ error: 'Video not found' });
            }

            const video = videoDoc.data() as VideoDocument;
            const user = session.user as any;

            // Check authorization
            const permission = checkEditPermission(
                user.role,
                user.xidClaims,
                video.authorXid,
                video.authorXidLower,
                video.members
            );

            if (!permission.canEdit) {
                if (permission.isMember && !permission.memberApproved) {
                    return res.status(403).json({
                        error: '投稿者からの編集承認を待っています。承認されるまで編集できません。',
                        code: 'MEMBER_NOT_APPROVED'
                    });
                }
                return res.status(403).json({
                    error: 'You do not have permission to edit this video.'
                });
            }

            // Parse update data
            const updateData = req.body;

            // Determine publication status
            const now = new Date();
            const startTime = video.startTime instanceof Date ? video.startTime :
                (video.startTime as any).toDate ? (video.startTime as any).toDate() :
                    new Date(video.startTime);

            const isPublished = startTime <= now;

            // Define field sets
            // 公開済み動画でも編集可能なフィールド
            const alwaysEditable = [
                'snsPlans', 'homepageComment', 'otherSns', 'description',
                'software', 'beforeComment', 'afterComment', 'listen', 'episode',
                'endMessage', 'members', 'agreedToTerms'
            ];

            // 公開前のみ編集可能なフィールド
            const prePublicationOnly = [
                'title', 'music', 'credit', 'musicUrl', 'role',
                'movieYear', 'videoUrl', 'rightType', 'link',
                'authorChannelUrl', 'authorIconUrl', 'authorName', 'authorXid'
            ];

            // Base allowed fields
            let allowedFields = [...alwaysEditable];

            // Add pre-publication fields if not published yet
            if (!isPublished) {
                allowedFields = [...allowedFields, ...prePublicationOnly];
            }
            // 公開済み動画: alwaysEditableのみ許可（videoUrl, link, authorIconUrl等は編集不可）

            const updates: Partial<VideoDocument> = {};

            // Helper to add field if present
            const addIfPresent = (field: string) => {
                if (updateData[field] !== undefined) {
                    (updates as any)[field] = updateData[field];
                }
            };

            // Apply updates based on allowed fields
            for (const field of allowedFields) {
                addIfPresent(field);
            }

            // Exceptions or special handling
            // If admin, allowing everything is handled below, but this block handles general users.

            // Admin Override
            if (user.role === 'admin') {
                const adminFields = [
                    'authorXid', 'authorName', 'authorIconUrl', 'authorChannelUrl',
                    'eventIds', 'startTime', 'slotId', 'videoUrl', 'type', 'type2',
                    'musicUrl', 'otherSns', 'rightType', 'software',
                    'beforeComment', 'afterComment', 'listen', 'episode', 'endMessage',
                    'members', 'movieYear', 'snsPlans', 'homepageComment', 'link', 'agreedToTerms',
                    'title', 'description', 'music', 'credit'
                ];

                for (const field of adminFields) {
                    addIfPresent(field);
                }

                // Update authorXidLower if authorXid is changed
                if (updateData.authorXid) {
                    updates.authorXidLower = updateData.authorXid.toLowerCase();
                }
            }

            // Add timestamp
            updates.updatedAt = new Date();

            await adminDb.collection('videos').doc(id).update(updates);

            return res.status(200).json({
                success: true,
                message: 'Video updated successfully',
                updatedFields: Object.keys(updates)
            });

        } catch (error) {
            console.error('Error updating video:', error);
            return res.status(500).json({ error: 'Failed to update video' });
        }
    }

    // PATCH: Approve/reject member edit permission (author only)
    if (req.method === 'PATCH') {
        const session = await getServerSession(req, res, authOptions);

        if (!session?.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const videoDoc = await adminDb.collection('videos').doc(id).get();

            if (!videoDoc.exists) {
                return res.status(404).json({ error: 'Video not found' });
            }

            const video = videoDoc.data() as VideoDocument;
            const user = session.user as any;

            // Check if user is the author
            const permission = checkEditPermission(
                user.role,
                user.xidClaims,
                video.authorXid,
                video.authorXidLower,
                video.members
            );

            if (!permission.isAuthor && user.role !== 'admin') {
                return res.status(403).json({
                    error: '投稿者のみがメンバーの編集権限を変更できます。'
                });
            }

            const { memberXid, editApproved } = req.body;

            if (!memberXid || typeof editApproved !== 'boolean') {
                return res.status(400).json({
                    error: 'memberXid and editApproved (boolean) are required'
                });
            }

            const memberXidLower = memberXid.toLowerCase();

            // Update member's editApproved status
            const updatedMembers = (video.members || []).map(member => {
                if (member.xid.toLowerCase() === memberXidLower) {
                    return { ...member, editApproved };
                }
                return member;
            });

            await adminDb.collection('videos').doc(id).update({
                members: updatedMembers,
                updatedAt: new Date()
            });

            return res.status(200).json({
                success: true,
                message: editApproved
                    ? `@${memberXid} の編集権限を承認しました`
                    : `@${memberXid} の編集権限を取り消しました`
            });

        } catch (error) {
            console.error('Error updating member permission:', error);
            return res.status(500).json({ error: 'Failed to update member permission' });
        }
    }

    // PATCH: Update specific fields (e.g., Restore / Soft Delete toggle)
    if (req.method === 'PATCH') {
        const session = await getServerSession(req, res, authOptions);
        if (!session?.user || (session.user as any).role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { restore } = req.body;

        try {
            if (restore) {
                // Restore logic
                await adminDb.collection('videos').doc(id).update({
                    isDeleted: false,
                    deletedAt: null,
                    updatedAt: new Date()
                });
                return res.status(200).json({ success: true, message: 'Video restored' });
            }
        } catch (error) {
            console.error('Error restoring video:', error);
            return res.status(500).json({ error: 'Failed to restore video' });
        }
    }

    // DELETE: Soft-delete video (admin only)
    if (req.method === 'DELETE') {
        const session = await getServerSession(req, res, authOptions);

        if (!session?.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const user = session.user as any;

        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { force } = req.query;

        try {
            // Check if video exists
            const videoDoc = await adminDb.collection('videos').doc(id).get();

            if (!videoDoc.exists) {
                return res.status(404).json({ error: 'Video not found' });
            }

            // Force Delete (Hard Delete)
            if (force === 'true') {
                await adminDb.collection('videos').doc(id).delete();
                return res.status(200).json({
                    success: true,
                    message: 'Video permanently deleted.'
                });
            }

            const video = videoDoc.data() as VideoDocument;

            // Check if already deleted
            if (video.isDeleted) {
                return res.status(400).json({ error: 'Video is already deleted' });
            }

            const now = new Date();
            const batch = adminDb.batch();

            // Unassign from slot if assigned (slots are actually freed)
            if (video.slotId) {
                batch.update(adminDb.collection('slots').doc(video.slotId), {
                    videoId: null,
                    updatedAt: now
                });
            }

            // Soft-delete the video (mark as deleted, keep for 30 days)
            batch.update(adminDb.collection('videos').doc(id), {
                isDeleted: true,
                deletedAt: now,
                deletedBy: user.id || user.discordId || 'admin',
                slotId: null, // Clear slot reference
                updatedAt: now
            });

            await batch.commit();

            return res.status(200).json({
                success: true,
                message: 'Video soft-deleted successfully. Will be permanently deleted after 30 days.'
            });

        } catch (error) {
            console.error('Error soft-deleting video:', error);
            return res.status(500).json({ error: 'Failed to delete video' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
