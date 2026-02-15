// Operation Log utility functions for audit trail and restoration
import { adminDb } from './firebase-admin';
import type {
    CreateOperationLogInput,
    OperationLogDocument,
    TargetCollection,
    OperationLogQueryParams,
    OperationLogApiResponse
} from '@/types/operationLog';

const OPERATION_LOGS_COLLECTION = 'operationLogs';
const LOG_RETENTION_DAYS = 30;

/**
 * Create an operation log entry
 * @param input - The operation log data
 * @returns The created log document ID
 */
export async function createOperationLog(input: CreateOperationLogInput): Promise<string> {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + LOG_RETENTION_DAYS);

    const logDoc: Omit<OperationLogDocument, 'id'> = {
        targetCollection: input.targetCollection,
        targetDocId: input.targetDocId,
        operationType: input.operationType,
        beforeData: input.beforeData,
        afterData: input.afterData,
        operatedBy: input.operatedBy,
        timestamp: now,
        expiresAt,
        description: input.description,
    };

    const docRef = await adminDb.collection(OPERATION_LOGS_COLLECTION).add(logDoc);
    return docRef.id;
}

/**
 * Helper function to log a create operation
 */
export async function logCreate(
    targetCollection: TargetCollection,
    targetDocId: string,
    afterData: Record<string, unknown>,
    operatedBy: string,
    description?: string
): Promise<string> {
    return createOperationLog({
        targetCollection,
        targetDocId,
        operationType: 'create',
        beforeData: null,
        afterData,
        operatedBy,
        description: description || `Created ${targetCollection} document`,
    });
}

/**
 * Helper function to log an update operation
 */
export async function logUpdate(
    targetCollection: TargetCollection,
    targetDocId: string,
    beforeData: Record<string, unknown>,
    afterData: Record<string, unknown>,
    operatedBy: string,
    description?: string
): Promise<string> {
    return createOperationLog({
        targetCollection,
        targetDocId,
        operationType: 'update',
        beforeData,
        afterData,
        operatedBy,
        description: description || `Updated ${targetCollection} document`,
    });
}

/**
 * Helper function to log a delete operation
 */
export async function logDelete(
    targetCollection: TargetCollection,
    targetDocId: string,
    beforeData: Record<string, unknown>,
    operatedBy: string,
    description?: string
): Promise<string> {
    return createOperationLog({
        targetCollection,
        targetDocId,
        operationType: 'delete',
        beforeData,
        afterData: null,
        operatedBy,
        description: description || `Deleted ${targetCollection} document`,
    });
}

/**
 * Convert Firestore timestamp to Date
 */
function toDate(value: any): Date {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value._seconds === 'number') return new Date(value._seconds * 1000);
    return new Date(value);
}

/**
 * Query operation logs
 */
export async function queryOperationLogs(
    params: OperationLogQueryParams
): Promise<OperationLogApiResponse[]> {
    let query: FirebaseFirestore.Query = adminDb.collection(OPERATION_LOGS_COLLECTION);

    if (params.targetCollection) {
        query = query.where('targetCollection', '==', params.targetCollection);
    }

    if (params.targetDocId) {
        query = query.where('targetDocId', '==', params.targetDocId);
    }

    if (params.operationType) {
        query = query.where('operationType', '==', params.operationType);
    }

    if (params.operatedBy) {
        query = query.where('operatedBy', '==', params.operatedBy);
    }

    // Order by timestamp descending
    query = query.orderBy('timestamp', 'desc');

    // Apply limit
    const limit = params.limit || 50;
    query = query.limit(limit);

    const snapshot = await query.get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            targetCollection: data.targetCollection,
            targetDocId: data.targetDocId,
            operationType: data.operationType,
            beforeData: data.beforeData,
            afterData: data.afterData,
            operatedBy: data.operatedBy,
            timestamp: toDate(data.timestamp).toISOString(),
            expiresAt: toDate(data.expiresAt).toISOString(),
            description: data.description,
        };
    });
}

/**
 * Get a single operation log by ID
 */
export async function getOperationLog(logId: string): Promise<OperationLogApiResponse | null> {
    const doc = await adminDb.collection(OPERATION_LOGS_COLLECTION).doc(logId).get();

    if (!doc.exists) {
        return null;
    }

    const data = doc.data()!;
    return {
        id: doc.id,
        targetCollection: data.targetCollection,
        targetDocId: data.targetDocId,
        operationType: data.operationType,
        beforeData: data.beforeData,
        afterData: data.afterData,
        operatedBy: data.operatedBy,
        timestamp: toDate(data.timestamp).toISOString(),
        expiresAt: toDate(data.expiresAt).toISOString(),
        description: data.description,
    };
}

/**
 * Restore a document from an operation log
 * Uses the beforeData for update/delete operations
 */
export async function restoreFromLog(logId: string): Promise<void> {
    const log = await getOperationLog(logId);

    if (!log) {
        throw new Error('Log not found');
    }

    // Determine which data to use for restoration
    let dataToRestore: Record<string, unknown> | null;

    if (log.operationType === 'delete') {
        // For delete operations, restore the beforeData
        dataToRestore = log.beforeData;
    } else if (log.operationType === 'update') {
        // For update operations, restore to the beforeData (previous state)
        dataToRestore = log.beforeData;
    } else {
        // For create operations, we can't "restore" - this would be undoing creation
        throw new Error('Cannot restore from a create operation. Use delete instead.');
    }

    if (!dataToRestore) {
        throw new Error('No data available for restoration');
    }

    // Remove system fields that shouldn't be overwritten
    const { id, createdAt, ...restoreData } = dataToRestore as any;

    // Get the target collection and document
    const collectionRef = adminDb.collection(log.targetCollection);
    const docRef = collectionRef.doc(log.targetDocId);

    // Check if document exists
    const existingDoc = await docRef.get();

    if (existingDoc.exists) {
        // Update existing document
        await docRef.update({
            ...restoreData,
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            updatedAt: new Date(),
        });
    } else {
        // Recreate deleted document
        await docRef.set({
            ...restoreData,
            createdAt: createdAt ? toDate(createdAt) : new Date(),
            updatedAt: new Date(),
            isDeleted: false,
        });
    }
}

/**
 * Delete expired operation logs
 * @returns Number of deleted logs
 */
export async function purgeExpiredLogs(): Promise<number> {
    const now = new Date();

    const expiredSnapshot = await adminDb
        .collection(OPERATION_LOGS_COLLECTION)
        .where('expiresAt', '<', now)
        .get();

    if (expiredSnapshot.empty) {
        return 0;
    }

    const batch = adminDb.batch();
    expiredSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    return expiredSnapshot.size;
}

/**
 * Purge logs older than specified retention days
 * @param retentionDays - 30, 90, or 180 days
 * @returns Number of deleted logs
 */
export async function purgeLogsByRetention(retentionDays: 30 | 90 | 180): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    let totalDeleted = 0;
    const BATCH_SIZE = 450;

    // Use pagination to handle large datasets
    let hasMore = true;
    while (hasMore) {
        const snapshot = await adminDb
            .collection(OPERATION_LOGS_COLLECTION)
            .where('timestamp', '<', cutoff)
            .limit(BATCH_SIZE)
            .get();

        if (snapshot.empty) {
            hasMore = false;
            break;
        }

        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        totalDeleted += snapshot.size;

        if (snapshot.size < BATCH_SIZE) {
            hasMore = false;
        }
    }

    return totalDeleted;
}
