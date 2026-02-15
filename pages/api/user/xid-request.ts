// XID Request API - User endpoint for XID claim management
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import {
    requestXidClaim,
    getXidClaimsForUser,
    checkAutoMatchXid,
} from '@/libs/userService';
import type { XidClaim } from '@/types/user';

interface XidRequestResponse {
    success: boolean;
    message?: string;
    claims?: XidClaim[];
    autoMatch?: {
        matched: boolean;
        videoCount: number;
    };
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<XidRequestResponse>
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

    const discordId = user.id;

    if (req.method === 'GET') {
        // Get current user's XID claims
        try {
            const claims = await getXidClaimsForUser(discordId);
            return res.status(200).json({
                success: true,
                claims,
            });
        } catch (error) {
            console.error('Failed to get XID claims:', error);
            return res.status(500).json({
                success: false,
                message: '取得に失敗しました',
            });
        }
    }

    if (req.method === 'POST') {
        // Submit new XID claim request
        try {
            const { xid, checkMatch } = req.body as {
                xid: string;
                checkMatch?: boolean;
            };

            if (!xid || typeof xid !== 'string' || xid.trim().length < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'XIDを入力してください',
                });
            }

            // Check for auto-match first if requested
            let autoMatch;
            if (checkMatch) {
                autoMatch = await checkAutoMatchXid(discordId, xid.trim());
                if (autoMatch.matched) {
                    // Already added as pending claim in checkAutoMatchXid
                    return res.status(200).json({
                        success: true,
                        message: `${autoMatch.videoCount}件の作品が見つかりました。承認申請を送信しました。`,
                        autoMatch,
                    });
                }
            }

            // Submit normal claim request
            const result = await requestXidClaim(discordId, xid.trim());
            return res.status(result.success ? 200 : 400).json({
                ...result,
                autoMatch,
            });
        } catch (error) {
            console.error('Failed to request XID claim:', error);
            return res.status(500).json({
                success: false,
                message: '申請に失敗しました',
            });
        }
    }

    return res.status(405).json({
        success: false,
        message: 'Method not allowed',
    });
}
