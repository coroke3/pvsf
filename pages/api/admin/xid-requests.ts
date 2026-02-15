// XID Requests Admin API - Manage pending XID claims
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { isAdmin, getAllPendingXidClaims, processXidClaim } from '@/libs/userService';
import type { XidClaim } from '@/types/user';

interface XidRequestsResponse {
    success: boolean;
    message?: string;
    pendingClaims?: {
        discordId: string;
        discordUsername: string;
        claim: XidClaim;
    }[];
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<XidRequestsResponse>
) {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    const user = session?.user as { id?: string } | undefined;
    if (!user?.id) {
        return res.status(401).json({
            success: false,
            message: '認証が必要です',
        });
    }

    // Check admin role
    const adminCheck = await isAdmin(user.id);
    if (!adminCheck) {
        return res.status(403).json({
            success: false,
            message: '管理者権限が必要です',
        });
    }

    if (req.method === 'GET') {
        // Get all pending XID claims
        try {
            const pendingClaims = await getAllPendingXidClaims();
            return res.status(200).json({
                success: true,
                pendingClaims,
            });
        } catch (error) {
            console.error('Failed to get pending XID claims:', error);
            return res.status(500).json({
                success: false,
                message: '取得に失敗しました',
            });
        }
    }

    if (req.method === 'POST') {
        // Process XID claim (approve/reject)
        try {
            const { discordId, xid, action } = req.body as {
                discordId: string;
                xid: string;
                action: 'approve' | 'reject';
            };

            if (!discordId || !xid || !action) {
                return res.status(400).json({
                    success: false,
                    message: '必須パラメータが不足しています',
                });
            }

            if (action !== 'approve' && action !== 'reject') {
                return res.status(400).json({
                    success: false,
                    message: 'actionはapproveまたはrejectである必要があります',
                });
            }

            const result = await processXidClaim(
                discordId,
                xid,
                action,
                user.id
            );

            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Failed to process XID claim:', error);
            return res.status(500).json({
                success: false,
                message: '処理に失敗しました',
            });
        }
    }

    return res.status(405).json({
        success: false,
        message: 'Method not allowed',
    });
}
