import { NotFoundError, InternalServerError } from '@/errors/index.js';
import logger from '@/logger/logger.js';
import type { PoolClient } from 'pg';

export async function deliverEventHandler(jobData: any, client: PoolClient, worker_id: string) {
  const { event_id, tenant_id, subscription_id, outbox_id } = jobData;
  try {
    await client.query('BEGIN');
  } catch (error: any) {
    logger.error(`Error transforming event in worker ${worker_id} with outbox id: ${outbox_id}: ${error.message}`);
    await client.query('ROLLBACK');
    await client.query(
      `UPDATE event_outbox
         SET retry_count = retry_count + 1,
             error_message = $1,
             updated_at = now()
         WHERE id = $2`,
      [error.message, outbox_id],
    );
    if (error instanceof NotFoundError) throw error;
    throw new InternalServerError(
      `Failed to transform event in worker ${worker_id} with outbox id: ${outbox_id}: ${error.message}`,
    );
  }
}
