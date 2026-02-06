
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';

// GoogleドライブURLからファイルIDを抽出
function extractGoogleDriveFileId(url: string): string | null {
    if (!url) return null;

    // drive.google.com/file/d/{fileId}/view 形式
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return fileMatch[1];

    // drive.google.com/open?id={fileId} 形式
    const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (openMatch) return openMatch[1];

    // 直接ファイルIDの場合（33文字以上のランダム文字列）
    if (/^[a-zA-Z0-9_-]{25,}$/.test(url)) return url;

    return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = session.user as any;

    if (!user.id) {
        return res.status(400).json({ error: 'User ID not found in session' });
    }

    try {
        // 1. ユーザーの承認済みXIDを取得
        const xidClaimsRef = adminDb.collection('xidClaims');
        const xidQuery = await xidClaimsRef
            .where('userId', '==', user.id)
            .where('status', '==', 'approved')
            .get();

        const xids = xidQuery.docs.map((doc: any) => doc.data().xid);

        if (xids.length === 0) {
            return res.status(200).json({ icons: [] });
        }

        const icons = new Set<string>();

        // 2. 動画コレクションからアイコンを取得
        const chunks = [];
        for (let i = 0; i < xids.length; i += 10) {
            chunks.push(xids.slice(i, i + 10));
        }

        for (const chunk of chunks) {
            const videosQuery = await adminDb.collection('videos')
                .where('authorXid', 'in', chunk)
                .select('authorIconUrl')
                .get();

            videosQuery.docs.forEach((doc: any) => {
                const data = doc.data();
                if (data.authorIconUrl) {
                    icons.add(data.authorIconUrl);
                }
            });
        }

        // 3. 外部API（Googleドライブアイコン）から取得
        try {
            const externalRes = await fetch('https://pvsf-cash.vercel.app/api/users');
            if (externalRes.ok) {
                const externalUsers = await externalRes.json();
                if (Array.isArray(externalUsers)) {
                    // XIDが一致するユーザーのアイコンを取得
                    const xidsLower = xids.map((x: string) => x.toLowerCase());
                    for (const extUser of externalUsers) {
                        if (extUser.twitterId && xidsLower.includes(extUser.twitterId.toLowerCase())) {
                            if (extUser.icon) {
                                const fileId = extractGoogleDriveFileId(extUser.icon);
                                if (fileId) {
                                    // GoogleドライブのアイコンURLを生成
                                    const driveIconUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
                                    icons.add(driveIconUrl);
                                }
                            }
                        }
                    }
                }
            }
        } catch (extError) {
            // 外部API取得失敗時は無視
            console.error('Failed to fetch external users for icons:', extError);
        }

        return res.status(200).json({
            icons: Array.from(icons)
        });

    } catch (error) {
        console.error('Error fetching user icons:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
