// Admin History API - View and restore operation logs
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import {
    queryOperationLogs,
    getOperationLog,
    restoreFromLog,
    purgeExpiredLogs,
    purgeLogsByRetention
} from '@/libs/operationLog';
import type { TargetCollection, OperationType } from '@/types/operationLog';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Verify admin access
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const user = session.user as any;

    if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    // GET: List operation logs
    if (req.method === 'GET') {
        try {
            const {
                collection,
                docId,
                type,
                operatedBy,
                limit,
            } = req.query;

            const logs = await queryOperationLogs({
                targetCollection: collection as TargetCollection | undefined,
                targetDocId: docId as string | undefined,
                operationType: type as OperationType | undefined,
                operatedBy: operatedBy as string | undefined,
                limit: limit ? parseInt(limit as string, 10) : 50,
            });

            return res.status(200).json(logs);
        } catch (error) {
            console.error('Error fetching operation logs:', error);
            return res.status(500).json({ error: 'Failed to fetch operation logs' });
        }
    }

    // POST: Restore from log
    if (req.method === 'POST') {
        const { action, logId } = req.body;

        if (action === 'restore') {
            if (!logId) {
                return res.status(400).json({ error: 'logId is required' });
            }

            try {
                const log = await getOperationLog(logId);
                if (!log) {
                    return res.status(404).json({ error: 'Log not found' });
                }

                await restoreFromLog(logId);

                return res.status(200).json({
                    success: true,
                    message: `Restored ${log.targetCollection}/${log.targetDocId} from log`,
                    restoredDocId: log.targetDocId,
                });
            } catch (error: any) {
                console.error('Error restoring from log:', error);
                return res.status(500).json({
                    error: error.message || 'Failed to restore from log'
                });
            }
        }

        if (action === 'purge') {
            const { retentionDays } = req.body;

            try {
                let deletedCount: number;

                if (retentionDays && [30, 90, 180].includes(retentionDays)) {
                    // Purge by specific retention period
                    deletedCount = await purgeLogsByRetention(retentionDays as 30 | 90 | 180);
                } else {
                    // Default: purge only truly expired logs
                    deletedCount = await purgeExpiredLogs();
                }

                return res.status(200).json({
                    success: true,
                    message: `Purged ${deletedCount} logs (${retentionDays ? retentionDays + '日以前' : '期限切れ'})`,
                    deletedCount,
                    retentionDays: retentionDays || 'default',
                });
            } catch (error) {
                console.error('Error purging logs:', error);
                return res.status(500).json({ error: 'Failed to purge logs' });
            }
        }

        return res.status(400).json({ error: 'Invalid action. Use "restore" or "purge".' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
