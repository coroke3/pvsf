// API ルート用の共通エラーハンドリング
import { NextApiResponse } from 'next';

export function handleApiError(res: NextApiResponse, error: unknown, context = '') {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[API Error]${context ? ` ${context}:` : ''}`, err);

  const status = (err as any)?.statusCode ?? 500;
  const message = status >= 500 ? 'Internal server error' : (err.message || 'Unknown error');

  if (!res.headersSent) {
    res.status(status).json({ error: message });
  }
}

export async function withApiErrorHandler<T>(
  res: NextApiResponse,
  handler: () => Promise<T>,
  context = ''
): Promise<T | void> {
  try {
    return await handler();
  } catch (error) {
    handleApiError(res, error, context);
  }
}
