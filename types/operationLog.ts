// Type definitions for Operation Logs (audit trail and restoration)

/**
 * Target collection types for operation logs
 */
export type TargetCollection = 'videos' | 'users' | 'eventSlots';

/**
 * Operation types
 */
export type OperationType = 'create' | 'update' | 'delete';

/**
 * Operation Log document structure
 * Used for audit trail and data restoration
 */
export interface OperationLogDocument {
    id: string;

    /** Target collection name */
    targetCollection: TargetCollection;

    /** Target document ID */
    targetDocId: string;

    /** Type of operation performed */
    operationType: OperationType;

    /** Data before the operation (null for create) */
    beforeData: Record<string, unknown> | null;

    /** Data after the operation (null for delete) */
    afterData: Record<string, unknown> | null;

    /** User who performed the operation */
    operatedBy: string;

    /** When the operation was performed */
    timestamp: Date;

    /** When this log entry expires (30 days after creation) */
    expiresAt: Date;

    /** Optional description of the operation */
    description?: string;
}

/**
 * Input for creating an operation log
 */
export interface CreateOperationLogInput {
    targetCollection: TargetCollection;
    targetDocId: string;
    operationType: OperationType;
    beforeData: Record<string, unknown> | null;
    afterData: Record<string, unknown> | null;
    operatedBy: string;
    description?: string;
}

/**
 * API response for operation logs
 */
export interface OperationLogApiResponse {
    id: string;
    targetCollection: string;
    targetDocId: string;
    operationType: string;
    beforeData: Record<string, unknown> | null;
    afterData: Record<string, unknown> | null;
    operatedBy: string;
    timestamp: string;
    expiresAt: string;
    description?: string;
}

/**
 * Query parameters for listing operation logs
 */
export interface OperationLogQueryParams {
    targetCollection?: TargetCollection;
    targetDocId?: string;
    operationType?: OperationType;
    operatedBy?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}
