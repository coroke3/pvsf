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

            // Fields that can be updated by author or approved members
            // Note: type and type2 are NOT editable by regular users
            const allowedFields = [
                'title', 'description', 'music', 'credit',
                'musicUrl', 'otherSns', 'rightType', 'software',
                'beforeComment', 'afterComment', 'listen', 'episode', 'endMessage',
                'members', 'homepageComment', 'link', 'snsPlans'
            ];

            const updates: Partial<VideoDocument> = {};

            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    (updates as any)[field] = updateData[field];
                }
            }

            // When updating members, only author can change editApproved status
            // Approved members can only update member names/roles, not editApproved
            if (updateData.members !== undefined && !permission.isAuthor && user.role !== 'admin') {
                // Preserve editApproved from original members
                const originalMembers = video.members || [];
                updates.members = updateData.members.map((newMember: any) => {
                    const original = originalMembers.find(
                        m => m.xid.toLowerCase() === newMember.xid?.toLowerCase()
                    );
                    return {
                        ...newMember,
                        editApproved: original?.editApproved || false,
                    };
                });
            }

            // Admin-only fields (including eventIds - regular users cannot change events)
            if (user.role === 'admin') {
                const adminFields = [
                    'authorXid', 'authorName', 'authorIconUrl', 'authorChannelUrl',
                    'eventIds', 'startTime', 'slotId', 'videoUrl', 'type', 'type2',
                    'musicUrl', 'otherSns', 'rightType', 'software', 
                    'beforeComment', 'afterComment', 'listen', 'episode', 'endMessage',
                    'members', 'movieYear', 'snsPlans', 'homepageComment', 'link', 'agreedToTerms'
                ];

                for (const field of adminFields) {
                    if (updateData[field] !== undefined) {
                        (updates as any)[field] = updateData[field];
                    }
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

        try {
            // Check if video exists
            const videoDoc = await adminDb.collection('videos').doc(id).get();

            if (!videoDoc.exists) {
                return res.status(404).json({ error: 'Video not found' });
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
